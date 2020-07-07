const iripo = (window.iripo = {
  counter: 0,
  allFns: new Map(),
  pausedFns: new Map(),
  inWatchers: new Map(),
  outWatchers: new Map(),
  processedElems: new WeakMap(),

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
      processNow: true,
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
    iripo.allFns.forEach(function (fn, symbol) {
      iripo.pause(symbol);
    });
  },
  resume: function resume(symbol, processNow = true) {
    iripo.pausedFns.delete(symbol);
    if (processNow) iripo.processInFns();

    return symbol;
  },
  resumeAll: function resumeAll() {
    iripo.allFns.forEach(function (fn, symbol) {
      iripo.resume(symbol, false);
    });
    iripo.processInFns();
  },
  processInFns: function processInFns() {
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

window.addEventListener('DOMContentLoaded', (event) => {
  function runIripo(mutations, observer) {
    iripo.processInFns();
    iripo.processOutFns(mutations);
  }

  new MutationObserver(runIripo).observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  });
});
