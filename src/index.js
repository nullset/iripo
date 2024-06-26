import "requestidlecallback-polyfill"; // NOTE: Required for Safari and IE11 support.

const iripo = (window.iripo = {
  paused: false, // All mutation functions have been paused at a system level, vs at a function level.
  allFns: new Map(),
  pausedFns: new Map(),
  inWatchers: new Map(),
  outWatchers: new Map(),
  processedElems: new WeakMap(),
  processingQueued: false,

  outElems: new Map(), // Elements which are observed for changes (out functions)

  getSymbol: function getSymbol(fn) {
    const match = Array.from(iripo.allFns.entries()).find(function (entry) {
      if (fn.toString() === entry[1].toString()) {
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

    let fnId = iripo.getSymbol(fn);

    if (!fnId) {
      fnId = Symbol();
      iripo.allFns.set(fnId, fn);
      typeFns.set(selector, actions.add(fnId));
    }
    return fnId;
  },
  in: function inFn(selector, fn, processNow) {
    const id = iripo.setAction(selector, fn, iripo.inWatchers);
    if (processNow) iripo.processInFns();

    return id;
  },
  out: function outFn(selector, fn) {
    return iripo.setAction(selector, fn, iripo.outWatchers);
  },
  clear: function removeInFn(symbol) {
    iripo.allFns.delete(symbol);
    iripo.pausedFns.delete(symbol);
    [iripo.inWatchers, iripo.outWatchers].forEach(function (typeFns) {
      typeFns.forEach(function (actions) {
        actions.delete(symbol);
      });
    });
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

                  fn(elem);
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
    Array.from(iripo.outElems.entries()).forEach(([elem, selectors]) => {
      Array.from(selectors.entries()).forEach(([selector, fns]) => {
        if (!elem.isConnected || !elem.matches(selector)) {
          fns.forEach((fn) => fn(elem));
          iripo.outElems.get(elem).delete(selector);
        }
        if (!iripo.outElems.get(elem).size) {
          iripo.outElems.delete(elem);
        }
      });
    });
  },
});

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

    new MutationObserver(watchMutations).observe(
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
