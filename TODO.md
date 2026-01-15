# Iripo TypeScript Refactor - Issues & Improvements

## Memory Leaks

### ✅ FIXED

1. **~~Duplicate cleanup functions~~** ✅ FALSE ALARM
   - **Analysis**: Guard `if (!processedInActions || !processedInActions.has(symbol))` prevents re-running for already-processed elements
   - **User out callbacks**: Called every mutation but Sets deduplicate identical function references from `allFns`
   - **Verdict**: No accumulation issue here

2. **Empty Sets left in watcher Maps** ✅ FIXED
   - **Issue**: When `clear(symbol)` removes the last symbol for a selector, empty Sets remain in `inWatchers`/`outWatchers`
   - **Example**: `iripo.in('.temp', cb)` then `iripo.clear(id)` leaves `inWatchers: '.temp' → Set()`
   - **Impact**: These are never GC'd (strings, not DOM elements). Accumulates indefinitely.
   - **Fix Applied**: After `actions.delete(symbol)`, check `if (actions.size === 0) typeFns.delete(selector)`

3. **Empty Sets in processedElems after cleanup** ✅ FIXED
   - **Issue**: When cleanup function runs `processedElems.get(elem)?.delete(symbol)`, it doesn't remove empty Sets
   - **Example**: Element matches `.active`, then loses class. Cleanup deletes symbol, leaving `processedElems: elem → Set()`
   - **Impact**: Elements that stay in DOM but repeatedly match/unmatch accumulate empty Sets. WKey won't GC them (still in DOM).
   - **Fix Applied**: Cleanup function now removes empty Sets: `if (set.size === 0) processedElems.delete(elem)`

4. **Race condition in destroy()** ✅ FIXED
   - **Issue**: If `destroy()` is called while `processingQueued === true`, the queued idle callback will execute after cleanup
   - **Impact**: Callbacks access cleared Maps, potential errors or re-population of cleared data
   - **Fix Applied**: Track `pendingIdleCallback` ID and call `cancelIdleCallback()` in `destroy()`

### 🟡 MEDIUM PRIORITY

5. **~~Global paused state in resume()~~** ✅ CORRECT BEHAVIOR
   - **Initial concern**: `resume(symbol)` sets `iripo.paused = false`, affecting ALL functions
   - **Clarification**: This is intentional! After `pauseAll()`, resuming ANY function should restart mutation processing
   - **How it works**: `paused = false` allows processing to run, but individual functions in `pausedFns` are still skipped
   - **Design**: Global `paused` is a performance optimization to skip ALL processing when everything is paused
   - **Verdict**: Working as designed

6. **No cleanup of event listeners** ✅ FIXED
   - **Issue**: DOMContentLoaded listener is never removed, even after destroy()
   - **Impact**: Minor memory leak, listener persists even if iripo is destroyed
   - **Fix Applied**: Added `domContentLoadedAdded` flag to track if listener was added, removed in `destroy()`

## Performance Issues

### 🔴 HIGH PRIORITY

7. **Function comparison via toString()** (index.ts:67-72)
   - **Issue**: Comparing functions using `.toString()` is expensive and unreliable (breaks with minification)
   - **Impact**: Performance hit on every registration, false negatives cause duplicate registrations
   - **Location**: `getSymbol()` method
   - **Fix**: Use WeakMap to track function identity, or document that users must reuse symbol if they want same behavior

### 🟡 MEDIUM PRIORITY

8. **~~querySelectorAll strategy~~** ✅ INTENTIONAL DESIGN
   - **Note**: Single `querySelectorAll(allSelectors)` is intentionally used instead of processing individual mutations
   - **Rationale**: One combined query is much faster than dozens/hundreds of individual querySelector calls
   - **Not an issue**: Mutation records are ignored by design for performance reasons

9. **Nested forEach loops** (index.ts:225-259)
   - **Issue**: Three levels of forEach (elements → selectors → symbols) on every mutation
   - **Impact**: O(elements × selectors × symbols) complexity
   - **Location**: `processInFns`
   - **Optimization**: Invert the loop order (iterate symbols first), or use indexed lookups

10. **Repeated selector validation** (index.ts:95-107)
    - **Issue**: Every call to `in()` or `out()` validates selector with querySelector, even for already-validated selectors
    - **Impact**: Unnecessary DOM queries for duplicate selectors
    - **Location**: `validateSelector()` in `in()` and `out()`
    - **Optimization**: Cache validated selectors in a Set

### 🟢 LOW PRIORITY

11. **Array.from on every mutation** (index.ts:224, 263)
    - **Issue**: Converting Map keys to Array on every mutation just to join them
    - **Impact**: Minor - creates temporary arrays frequently
    - **Location**: Both processing functions
    - **Optimization**: Pre-compute joined selectors and update when watchers change

## Code Quality / TypeScript

### 🟡 MEDIUM PRIORITY

13. **Inconsistent null handling** (index.ts:246, 269)
    - **Issue**: Optional chaining in some places (`fn?.(elem)`), non-null assertions in others (`elemSelectors.get(selector)!.add(fn)`)
    - **Impact**: Potential runtime errors if assumptions are wrong
    - **Location**: Various
    - **Fix**: Consistent null checking strategy with proper guards

14. **Type safety in WKey** (index.ts:20-21)
    - **Issue**: WKey types might not match actual usage (OutElemsMap vs actual Map structure)
    - **Impact**: Type errors might not catch runtime issues
    - **Location**: Type definitions
    - **Fix**: Verify WKey generic types match actual data structures

## Testing Gaps

15. **Need tests for:**
    - Cleanup function accumulation scenario
    - Pause/resume edge cases
    - Destroy while processing
    - Memory leak detection tests
    - Large DOM performance benchmarks
    - TypeScript type checking in consumer projects

## Summary of Changes Made

### Memory Leak Fixes ✅
1. **Empty Sets in watcher Maps** - `clear()` now removes empty Sets from `inWatchers`/`outWatchers` after deleting last symbol
2. **Empty Sets in processedElems** - Cleanup functions now remove empty Sets after deleting last symbol
3. **destroy() race condition** - Added `pendingIdleCallback` tracking and cancellation in `destroy()`
4. **DOMContentLoaded listener cleanup** - Added `domContentLoadedAdded` flag to track and remove listener in `destroy()`

### Understanding WKey Behavior
- WKey from `not-so-weak` uses FinalizationRegistry to auto-cleanup when **keys** (DOM elements) are GC'd
- Does NOT prevent empty Sets as **values** when elements stay in DOM
- Regular Maps (inWatchers/outWatchers) have NO auto-cleanup since keys are strings

### Remaining Questions

- Should `getSymbol` even exist? Is function deduplication necessary, or should users store symbols themselves?
- Do we need to support destroy/reinitialize cycles?
