import "requestidlecallback-polyfill"; // NOTE: Required for Safari support.
import { WKey } from "not-so-weak";

// ES modules are singletons - this code only executes once per page load
// Reuse existing window.iripo if it exists (e.g., from a <script> tag)
const iripo = window.iripo || {
  paused: false, // All mutation functions have been paused at a system level, vs at a function level.
  allFns: new Map(),
  pausedFns: new Map(),
  inWatchers: new Map(),
  outWatchers: new Map(),
  processedElems: new WKey(),
  processingQueued: false,
  observer: null, // MutationObserver instance (set after DOMContentLoaded)

  outElems: new WKey(), // Elements which are observed for changes (out functions)

  getSymbol: function getSymbol(selector, fn) {
    // Find the symbol for a function that matches the selector and function body.
    const match = Array.from(iripo.allFns.entries()).find(([key, value]) => {
      if (key.description === selector && fn.toString() === value.toString()) {
        return true;
      }
    });
    return match && match[0];
  },
  getFn: function getFn(symbol) {
    return iripo.allFns.get(symbol);
  },
  setAction: function setAction(selector, fn, typeFns) {
    const actions = typeFns.get(selector) || new Set();

    let fnId = iripo.getSymbol(selector, fn);

    if (!fnId) {
      fnId = Symbol(selector);
      iripo.allFns.set(fnId, fn);
      typeFns.set(selector, actions.add(fnId));
    }
    return fnId;
  },
  validateSelector: function validateSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      console.error("iripo: Invalid selector:", selector, error.message);
      return false;
    }
  },
  in: function inFn(selector, fn, processNow) {
    if (!iripo.validateSelector(selector)) return null;

    const id = iripo.setAction(selector, fn, iripo.inWatchers);
    if (processNow) iripo.processInFns();

    return id;
  },
  out: function outFn(selector, fn) {
    if (!iripo.validateSelector(selector)) return null;

    return iripo.setAction(selector, fn, iripo.outWatchers);
  },
  clear: function removeInFn(symbol) {
    // Get the function before deleting from allFns (needed for outElems cleanup)
    const userFn = iripo.allFns.get(symbol);

    // Clean processedElems - remove symbol from all elements
    iripo.processedElems.forEach(function (symbols, elem) {
      symbols.delete(symbol);
      if (symbols.size === 0) {
        iripo.processedElems.delete(elem);
      }
    });

    // Clean outElems - remove user function from all elements
    if (userFn) {
      iripo.outElems.forEach(function (selectors, elem) {
        selectors.forEach(function (fns, selector) {
          fns.delete(userFn);
          if (fns.size === 0) {
            selectors.delete(selector);
          }
        });
        if (selectors.size === 0) {
          iripo.outElems.delete(elem);
        }
      });
    }

    // Remove from core maps
    iripo.allFns.delete(symbol);
    iripo.pausedFns.delete(symbol);
    [iripo.inWatchers, iripo.outWatchers].forEach(function (typeFns) {
      typeFns.forEach(function (actions) {
        actions.delete(symbol);
      });
    });
  },
  destroy: function destroy() {
    // Disconnect the MutationObserver to stop watching for changes
    if (iripo.observer) {
      iripo.observer.disconnect();
      iripo.observer = null;
    }

    // Clear all data structures to free memory
    iripo.allFns.clear();
    iripo.pausedFns.clear();
    iripo.inWatchers.clear();
    iripo.outWatchers.clear();
    iripo.processedElems.clear();
    iripo.outElems.clear();

    // Reset state
    iripo.paused = false;
    iripo.processingQueued = false;
  },
  pause: function pause(symbol) {
    iripo.pausedFns.set(symbol, true);
    return symbol;
  },
  pauseAll: function pauseAll() {
    this.paused = true;
    iripo.allFns.forEach(function (fn, symbol) {
      iripo.pause(symbol);
    });
  },
  resume: function resume(symbol, processNow) {
    if (typeof processNow === "undefined") processNow = true;
    this.paused = false;
    iripo.pausedFns.delete(symbol);
    if (processNow) iripo.processInFns();

    return symbol;
  },
  resumeAll: function resumeAll() {
    this.paused = false;
    iripo.allFns.forEach(function (fn, symbol) {
      iripo.resume(symbol, false);
    });
    iripo.processInFns();
  },
  buildOutFn: function buildOutFn({ elem, selector, fn }) {
    if (iripo.outElems.has(elem)) {
      if (iripo.outElems.get(elem).has(selector)) {
        iripo.outElems.get(elem).get(selector).add(fn);
      } else {
        iripo.outElems.get(elem).set(selector, new Set([fn]));
      }
    } else {
      iripo.outElems.set(elem, new Map([[selector, new Set([fn])]]));
    }
  },
  processInFns: function processInFns(mutations) {
    if (iripo.inWatchers.size > 0) {
      const allSelectors = Array.from(iripo.inWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach(function (elem) {
        iripo.inWatchers.forEach(function (fnIds, selector) {
          if (elem.matches(selector)) {
            fnIds.forEach(function (symbol) {
              if (!iripo.pausedFns.get(symbol)) {
                const processedInActions = iripo.processedElems.get(elem);
                if (!processedInActions || !processedInActions.has(symbol)) {
                  const fn = iripo.getFn(symbol);
                  const set = processedInActions || new Set();

                  iripo.processedElems.set(elem, set.add(symbol));

                  // If the matching element is ever un-matched (ex. a class changes) then
                  // remove the element from the processedElems set, so that if it is ever
                  // re-added (ex. class changes back) then it will be run again.
                  iripo.buildOutFn({
                    elem,
                    selector,
                    fn: () => {
                      iripo.processedElems.get(elem)?.delete(symbol);
                    },
                  });

                  try {
                    fn(elem);
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

    if (iripo.outWatchers.size > 0) {
      const allSelectors = Array.from(iripo.outWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach(function (elem) {
        iripo.outWatchers.forEach(function (fnIds, selector) {
          if (elem.matches(selector)) {
            fnIds.forEach(function (symbol) {
              const fn = iripo.getFn(symbol);
              iripo.buildOutFn({ elem, selector, fn });
            });
          }
        });
      });
    }
  },
  processOutFns: function processOutFns(mutations) {
    // WKey automatically GCs disconnected elements, but we still clean up immediately
    // when elements stop matching selectors for better performance
    iripo.outElems.forEach(function (selectors, elem) {
      selectors.forEach(function (fns, selector) {
        if (!elem.isConnected || !elem.matches(selector)) {
          fns.forEach((fn) => {
            try {
              fn(elem);
            } catch (error) {
              console.error(
                "Error in iripo 'out' callback for selector:",
                selector,
                error
              );
            }
          });
          selectors.delete(selector);
        }
      });
      // Clean up empty selector maps immediately (WKey will GC the element eventually anyway)
      if (selectors.size === 0) {
        iripo.outElems.delete(elem);
      }
    });
  },
};

// Set on window for backward compatibility and global access
window.iripo = iripo;

// Only initialize observer once (prevents duplicate observers if module is imported multiple times)
if (!iripo.observer) {
  window.addEventListener(
    "DOMContentLoaded",
    function handleDOMContentLoaded(event) {
    // Run any initial `in` calls.
    if (!iripo.paused) iripo.processInFns();

    // Watch the page for any mutations. If they occur, requset that the browser run mutations during the next idle period.
    // If the idle period has not yet happened, do nothing, as all mutation functions run once the browser is idle.
    function watchMutations(mutations) {
      if (iripo.paused || iripo.processingQueued) return;
      iripo.processingQueued = true;

      // Have to use polyfill for Safari since it does not support `requestIdleCallback` natively.
      requestIdleCallback(
        function handleRequestIdleCallback() {
          iripo.processInFns(mutations);
          iripo.processOutFns(mutations);
          iripo.processingQueued = false;
        },
        { timeout: 1000 }
      );
    }

    iripo.observer = new MutationObserver(watchMutations);
    iripo.observer.observe(
      document.documentElement || document.body,
      {
        attributes: true,
        attributeOldValue: true,
        childList: true,
        subtree: true,
      }
    );
    }
  );
}

// Export as ES module (for modern import syntax)
export default iripo;
