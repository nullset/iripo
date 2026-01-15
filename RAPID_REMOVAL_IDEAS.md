# Ideas for Handling Rapid Remove/Re-add Scenarios

## Problem Statement

Currently, if an element is removed and re-added to the DOM before `requestIdleCallback` fires, Iripo sees it as "never left" and the `in()` callback does not run again.

Example:
```javascript
const div = document.createElement('div');
div.className = 'test';
document.body.appendChild(div);  // Callback runs

const fragment = document.createDocumentFragment();
fragment.appendChild(div);       // Remove from DOM
document.body.appendChild(div);   // Re-add to DOM
// If this happens before idle callback: callback does NOT run again
```

## Approach 1: Cache & Diff with Set.difference() ⭐ RECOMMENDED

**Idea:**
1. In `watchMutations` (synchronous), capture current matching elements
2. Compare with cached previous state using `Set.difference()`
3. Mark removed elements for re-processing
4. In idle callback, re-run callbacks for marked elements

**Benefits:**
- ✅ Single `querySelectorAll` (already optimized)
- ✅ Automatically catches descendants (removed parent's children show up in diff)
- ✅ Can reuse cached results in idle callback (avoid duplicate query)
- ✅ Clean diff logic using modern Set API
- ✅ Synchronous work is same as we'd do in idle anyway (just moved earlier)

**Implementation:**

```typescript
// Add to interface
export interface Iripo {
  // ... existing properties
  previousMatchingElements: Set<Element>;
  removedElementSymbols: WKey<Element, Set<symbol>>;
  // ...
}

// Add to initialization
const iripo: Iripo = (window.iripo as Iripo) || {
  // ... existing properties
  previousMatchingElements: new Set<Element>(),
  removedElementSymbols: new WKey<Element, Set<symbol>>(),
  // ...
};

// Modified watchMutations in initializeObserver:
const watchMutations = (mutations: MutationRecord[]) => {
  if (iripo.paused || iripo.processingQueued) return;

  // Synchronously capture current state
  if (iripo.inWatchers.size > 0) {
    const allSelectors = Array.from(iripo.inWatchers.keys()).join(",");

    // Build current matching set - much simpler!
    const currentMatching = new Set(document.querySelectorAll(allSelectors));
    const previousMatching = iripo.previousMatchingElements;

    // Diff to find removed elements
    const removed = previousMatching.difference(currentMatching);

    removed.forEach((elem) => {
      // Get symbols that were processed for this element
      const processedSymbols = iripo.processedElems.get(elem);
      if (processedSymbols) {
        // Mark these element+symbol pairs for re-running
        iripo.removedElementSymbols.set(elem, new Set(processedSymbols));
      }
    });

    // Cache for next time
    iripo.previousMatchingElements = currentMatching;
  }

  // Queue idle processing
  iripo.processingQueued = true;
  iripo.pendingIdleCallback = requestIdleCallback(
    () => {
      iripo.processInFns(mutations);
      iripo.processOutFns(mutations);
      iripo.processingQueued = false;
      iripo.pendingIdleCallback = null;
    },
    { timeout: 1000 }
  );
};

// Modified processInFns check:
processInFns(_mutations?: MutationRecord[]): void {
  if (iripo.inWatchers.size > 0) {
    const allSelectors = Array.from(iripo.inWatchers.keys()).join(",");
    document.querySelectorAll(allSelectors).forEach((elem) => {
      iripo.inWatchers.forEach((fnIds, selector) => {
        if (elem.matches(selector)) {
          fnIds.forEach((symbol) => {
            if (!iripo.pausedFns.get(symbol)) {
              const processedInActions = iripo.processedElems.get(elem);
              const wasRemoved = iripo.removedElementSymbols.get(elem)?.has(symbol);

              // Run if: never processed, OR was removed and re-added
              if (!processedInActions || !processedInActions.has(symbol) || wasRemoved) {
                const fn = iripo.getFn(symbol);
                const set = processedInActions || new Set<symbol>();

                iripo.processedElems.set(elem, set.add(symbol));

                // Clean up removed marker
                if (wasRemoved) {
                  const removedSymbols = iripo.removedElementSymbols.get(elem)!;
                  removedSymbols.delete(symbol);
                  if (removedSymbols.size === 0) {
                    iripo.removedElementSymbols.delete(elem);
                  }
                }

                iripo.buildOutFn({
                  elem,
                  selector,
                  fn: () => {
                    const set = iripo.processedElems.get(elem);
                    if (set) {
                      set.delete(symbol);
                      if (set.size === 0) {
                        iripo.processedElems.delete(elem);
                      }
                    }
                  },
                });

                try {
                  fn?.(elem);
                } catch (error) {
                  console.error(
                    "Error in iripo 'in' callback for selector:",
                    selector,
                    error
                  );
                }
              }
            }
          });
        }
      });
    });
  }
  // ... rest of processInFns (out watchers)
}

// Update destroy() to clear new caches:
destroy(): void {
  // ... existing cleanup
  iripo.previousMatchingElements.clear();
  iripo.removedElementSymbols.clear();
  // ...
}
```

**Browser Support Requirements:**

`Set.prototype.difference()` requires:
- Chrome 122+ (Feb 2024)
- Firefox 127+ (June 2024)
- Safari 17+ (Sept 2023)

This bumps Iripo's requirements from Chrome 84+/Firefox 79+/Safari 14.1+ to the above.

**Key Points:**

1. **Handles descendants automatically:** When a parent `<h1>` is removed, its child `.foo` will appear in the diff (was in previous, not in current)
2. **No duplicate queries:** Can potentially reuse `currentMatching` in idle callback instead of re-querying
3. **Minimal performance impact:** Moving querySelectorAll from idle to synchronous, but same work total
4. **Clean separation:** Synchronous = detection, Idle = execution

**Potential Optimization:**

Could reuse the cached state instead of re-querying in `processInFns`:

```typescript
// Pass the cached state
iripo.processInFns(mutations, currentMatching);

// Modify processInFns signature
processInFns(_mutations?: MutationRecord[], cachedMatching?: Map<string, Set<Element>>): void {
  if (cachedMatching) {
    // Use cached instead of querySelectorAll
    cachedMatching.forEach((elements, selector) => {
      // ...
    });
  } else {
    // Fallback to querySelectorAll (initial load, etc.)
  }
}
```

This would eliminate the duplicate query entirely!

---

## Approach 2: Per-Element MutationObserver

**Idea:** When an element's `in()` callback runs, create a dedicated MutationObserver for that specific element.

**Challenges:**
- Can't observe element for its own removal - would need to observe parent
- What if element moves between parents? Need to update observer target
- Performance: hundreds of matched elements = hundreds of observers
- Memory: need to track and clean up all observers

**Verdict:** Too complex and expensive

## Approach 2: Synchronous Removal Processing

**Idea:** Process removals immediately in `watchMutations`, before queuing idle callback.

```typescript
const watchMutations = (mutations: MutationRecord[]) => {
  // IMMEDIATELY process removals
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      mutation.removedNodes.forEach(node => {
        if (node instanceof Element) {
          const set = iripo.processedElems.get(node);
          if (set) {
            set.clear();
            iripo.processedElems.delete(node);
          }
        }
      });
    }
  });

  // THEN queue normal idle processing
  // ...
};
```

**Problems:**
1. User `out()` callbacks wouldn't run correctly (bypasses `processOutFns`)
2. Only handles removals, not selector changes (attribute mutations)
3. Performance cost - defeats purpose of `requestIdleCallback`

**Verdict:** Breaks existing functionality

## Approach 3: Track Removed Elements, Check on Re-add

**Idea:**
1. Synchronously mark removed elements in `watchMutations`
2. In `processInFns`, check if element is in "removed" set
3. If yes, re-run callback even though it's in `processedElems`
4. Remove from "removed" set

**Implementation:**

```typescript
const removedElementSymbols = new WKey<Element, Set<symbol>>();

// In watchMutations (synchronous):
if (mutation.type === 'childList') {
  mutation.removedNodes.forEach(node => {
    if (node instanceof Element) {
      const symbols = iripo.processedElems.get(node);
      if (symbols) {
        removedElementSymbols.set(node, new Set(symbols));
      }

      // Check all descendants
      node.querySelectorAll('*').forEach(descendant => {
        const descendantSymbols = iripo.processedElems.get(descendant);
        if (descendantSymbols) {
          removedElementSymbols.set(descendant, new Set(descendantSymbols));
        }
      });
    }
  });
}

// In processInFns (idle callback):
const wasRemoved = removedElementSymbols.get(elem)?.has(symbol);
if (!processedInActions || !processedInActions.has(symbol) || wasRemoved) {
  // Run callback
  removedElementSymbols.get(elem)?.delete(symbol);
  if (removedElementSymbols.get(elem)?.size === 0) {
    removedElementSymbols.delete(elem);
  }
}
```

**Challenges:**

### Descendant Detection Issue

`mutation.removedNodes` only contains directly removed elements, not descendants.

Example: `<h1>Stuff <div class="foo">Junk</div></h1>` - if `h1` is removed, `removedNodes` only contains the `h1`, not the `.foo` div.

**Solution A: querySelectorAll on removed nodes**
```typescript
node.querySelectorAll('*').forEach(descendant => {
  // check and mark
});
```
Problem: Synchronous DOM query on potentially large tree blocks main thread

**Solution B: Defer to idle callback**
```typescript
// In watchMutations, just set a flag
let hadRemovals = false;
if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
  hadRemovals = true;
}

// Later in idle callback, before processInFns:
if (hadRemovals) {
  iripo.processedElems.forEach((symbols, elem) => {
    if (!elem.isConnected) {
      removedElementSymbols.set(elem, new Set(symbols));
    }
  });
}
```
Problem: Checks ALL processed elements (could be many), but at least deferred to idle

**Verdict:** Promising but needs refinement for descendant handling

---

## Questions to Resolve

1. Is the performance cost of tracking removals worth the benefit?
2. How common is the rapid remove/re-add scenario in real-world usage?
3. Should this be opt-in behavior rather than default?
4. Can we find a simpler solution that handles the most common cases?
