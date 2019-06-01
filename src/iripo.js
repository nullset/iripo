const inFns = (window.inFns = new Map());
const outFns = (window.outFns = new Map());
const processedInFns = (window.processedInFns = new WeakMap());

const iripo = {
  in: function inFn(selector, fn, opts = { processNow: true }) {
    const inActions = inFns.get(selector) || new Set();
    inFns.set(selector, inActions.add(fn));
    if (opts.processNow) iripo.processInFns();
  },
  out: function outFn(selector, fn) {
    const outActions = outFns.get(selector) || new Set();
    outFns.set(selector, outActions.add(fn));
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
      document.querySelectorAll(allSelectors).forEach(function(elem) {
        inFns.forEach(function(fns, selector) {
          if (elem.matches(selector)) {
            fns.forEach(function(fn) {
              const processedInActions = processedInFns.get(elem);
              if (!processedInActions || !processedInActions.has(fn)) {
                const set = processedInActions || new Set();
                processedInFns.set(elem, set.add(fn));
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
      mutations.forEach(function(mutation) {
        if (mutation.removedNodes.length > 0) {
          outFns.forEach(function(fns, selector) {
            Array.from(mutation.removedNodes).forEach(function(node) {
              if (node.nodeType === 1) {
                const matchingNodes = new Set();
                if (node.matches(selector)) matchingNodes.add(node);
                Array.from(node.querySelectorAll(selector)).forEach(function(
                  childNode
                ) {
                  matchingNodes.add(childNode);
                });
                matchingNodes.forEach(function(node) {
                  fns.forEach(function(fn) {
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
