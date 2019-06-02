const inFns = (window.inFns = new Map());
const outFns = (window.outFns = new Map());
const processedInFns = (window.processedInFns = new WeakMap());

const allFns = new Map();

const iripo = {
  counter: 0,
  // inFns: new Map(),
  // outFns: new Map(),
  // processInFns: new WeakMap();
  // allFns: new Map(),

  getFnId: function getFnId(fn) {
    const match = Array.from(allFns.entries()).find(function (entry) {
      if (fn.toString() === entry[1].toString()) {
        return true;
      }
    });
    return match && match[0];
  },
  getFn: function getFn(id) {
    return allFns.get(id);
  },
  setAction: function setAction(selector, fn, typeFns) {
    const actions = typeFns.get(selector) || new Set();

    let fnId = iripo.getFnId(fn);

    if (!fnId) {
      fnId = Symbol(iripo.counter);
      allFns.set(fnId, fn);
      typeFns.set(selector, actions.add(fnId));
      iripo.counter++;
    }
    return fnId;
  },
  in: function inFn(selector, fn, opts = { processNow: true }) {
    const id = iripo.setAction(selector, fn, inFns);
    if (opts.processNow) iripo.processInFns();
    return id;
  },
  out: function outFn(selector, fn) {
    return iripo.setAction(selector, fn, outFns);
  },
  // clearFn: function clearFn(typeFns, selector, fn) {
  //   const fns = typeFns.get(selector);
  //   if (typeof fn === "function") {
  //     fns.delete(fn);
  //   } else {
  //     elemMap.set(
  //       selector,
  //       Array.from(fns).filter(matchFn => matchFn.toString() !== fn.toString())
  //     );
  //   }
  // },
  clear: function removeInFn(symbol) {
    // iripo.clearFn(symbol);
    allFns.delete(symbol);
    [inFns, outFns].forEach(function (typeFns) {
      typeFns.forEach(function (actions) {
        actions.delete(symbol);
      });
    });
  },
  pause: function pause(symbol) {

  },
  // removeIn: function removeInFn(selector, fn) {
  //   iripo.clearFn(inFns, selector, fn);
  // },
  processInFns: function processInFns() {
    console.log("process");
    if (inFns.size > 0) {
      const allSelectors = Array.from(inFns.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach(function (elem) {
        inFns.forEach(function (fnIds, selector) {
          if (elem.matches(selector)) {
            fnIds.forEach(function (id) {
              const processedInActions = processedInFns.get(elem);
              if (!processedInActions || !processedInActions.has(id)) {
                const fn = iripo.getFn(id);
                const set = processedInActions || new Set();
                processedInFns.set(elem, set.add(id));
                fn(elem);
              }
            });
          }
        });
      });
    }
  },
  processOutFns: function processOutFns(mutations) {
    if (outFns.size > 0) {
      mutations.forEach(function (mutation) {
        if (mutation.removedNodes.length > 0) {
          outFns.forEach(function (fnIds, selector) {
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
                  fnIds.forEach(function (id) {
                    const fn = iripo.getFn(id);
                    fn(node);
                  });
                });
              }
            });
          });
        }
      });
    }
  }
};

window.addEventListener("DOMContentLoaded", event => {
  function runIripo(mutations, observer) {
    iripo.processInFns();
    iripo.processOutFns(mutations);
  }

  new MutationObserver(runIripo).observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true
  });
});
