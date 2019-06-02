const inFns = (window.inFns = new Map());
const outFns = (window.outFns = new Map());
const processedInFns = (window.processedInFns = new WeakMap());

let fnIdCounter = 0;
const allFns = new Map();

const iripo = {
  counter: 0,
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
  setAction: function getOrCreateFn(selector, fn, typeFns) {
    const actions = typeFns.get(selector) || new Set();

    let fnId = iripo.getFnId(fn);

    if (!fnId) {
      iripo.counter++;
      fnId = iripo.counter;
      allFns.set(fnId, fn);
    }

    typeFns.set(selector, actions.add(fnId));
  },
  in: function inFn(selector, fn, opts = { processNow: true }) {
    iripo.setAction(selector, fn, inFns);
    if (opts.processNow) iripo.processInFns();
  },
  out: function outFn(selector, fn) {
    iripo.setAction(selector, fn, outFns);
  },
  clearFn: function clearFn(elemMap, selector, fn) {
    const fns = elemMap.get(selector);
    if (typeof fn === "function") {
      fns.delete(fn);
    } else {
      elemMap.set(
        selector,
        Array.from(fns).filter(matchFn => matchFn.toString() !== fn.toString())
      );
    }
  },
  removeIn: function removeInFn(selector, fn) {
    iripo.clearFn(inFns, selector, fn);
  },
  removeOut: function removeOutFn(selector, fn) {
    iripo.clearFn(outFns, selector, fn);
  },
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
