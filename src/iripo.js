const iripo = (window.iripo = {
  counter: 0,
  paused: false, // All mutation functions have been paused at a system level, vs at a function level.
  allFns: new Map(),
  pausedFns: new Map(),
  inWatchers: new Map(),
  outWatchers: new Map(),
  processedElems: new WeakMap(),
  processingQueued: false,
  ignoreMutationsInHead: true,

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
      fnId = Symbol(iripo.counter);
      iripo.allFns.set(fnId, fn);
      typeFns.set(selector, actions.add(fnId));
      iripo.counter++;
    }
    return fnId;
  },
  in: function inFn(
    selector,
    fn,
    opts = {
      processNow: false,
    }
  ) {
    const id = iripo.setAction(selector, fn, iripo.inWatchers);
    if (opts.processNow) iripo.processInFns();

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
  resume: function resume(symbol, processNow = true) {
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
  allMutationsAreInHead: function allMutationsAreInHead(mutations) {
    if (
      this.ignoreMutationsInHead &&
      mutations &&
      mutations.every(function (m) {
        return m.target.tagName === 'HEAD';
      })
    )
      return true;
  },
  processInFns: function processInFns(mutations) {
    if (this.allMutationsAreInHead(mutations)) return;

    if (iripo.inWatchers.size > 0) {
      const allSelectors = Array.from(iripo.inWatchers.keys()).join(',');
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
                  fn(elem);
                }
              }
            });
          }
        });
      });
    }
  },
  processOutFns: function processOutFns(mutations) {
    if (this.allMutationsAreInHead(mutations)) return;

    if (iripo.outWatchers.size > 0) {
      mutations.forEach(function (mutation) {
        if (mutation.removedNodes.length > 0) {
          iripo.outWatchers.forEach(function (fnIds, selector) {
            Array.from(mutation.removedNodes).forEach(function (node) {
              if (node.nodeType === 1) {
                const matchingNodes = new Set();
                if (node.matches(selector)) matchingNodes.add(node);

                Array.from(node.querySelectorAll(selector)).forEach(function (
                  childNode
                ) {
                  matchingNodes.add(childNode);
                });
                matchingNodes.forEach(function (node) {
                  fnIds.forEach(function (symbol) {
                    if (!iripo.pausedFns.get(symbol)) {
                      const fn = iripo.getFn(symbol);
                      fn(node);
                    }
                  });
                });
              }
            });
          });
        }
      });
    }
  },
});

window.addEventListener('DOMContentLoaded', function handleDOMContentLoaded(
  event
) {
  // Run any initial `in` calls.
  if (!iripo.paused) iripo.processInFns();

  // Watch the page for any mutations. If they occur, requset that the browser run mutations during the next idle period.
  // If the idle period has not yet happened, do nothing, as all mutation functions run once the browser is idle.
  function watchMutations(mutations, observer) {
    if (iripo.paused || iripo.processingQueued) return;
    iripo.processingQueued = true;
    requestIdleCallback(function handleRequestIdleCallback() {
      iripo.processInFns(mutations);
      iripo.processOutFns(mutations);
      iripo.processingQueued = false;
    });
  }

  new MutationObserver(watchMutations).observe(
    document.documentElement || document.body,
    {
      attributes: true,
      childList: true,
      subtree: true,
    }
  );
});
