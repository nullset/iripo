const matchMap = window.matchMap = new Map();
const removeMatchMap = window.removeMatchMap = new Map();
const executedMap = window.executedMap = new WeakMap();

const existo = {
  onAdd: function onAdd(selector, fn, opts = { processNow: true }) {
    const selectorActions = matchMap.get(selector) || new Set();
    matchMap.set(selector, selectorActions.add(fn));
    if (opts.processNow) existo.processAdds();
  },
  onRemove: function onRemove(selector, fn) {
    const removeSelectorActions = removeMatchMap.get(selector) || new Set();
    removeMatchMap.set(selector, removeSelectorActions.add(fn));
  },
  clearFn: function clearFn(elemMap, selector, fn) {
    const fns = elemMap.get(selector);
    if (typeof fn === 'function') {
      fns.delete(fn);
    } else {
      elemMap.set(selector, Array.from(fns).filter(matchFn => matchFn.toString() !== fn.toString()))
    }

  },
  clearAdd: function clearAdd(selector, fn) {
    existo.clearFn(matchMap, selector, fn);
  },
  clearRemove: function clearRemove(selector, fn) {
    existo.clearFn(removeMatchMap, selector, fn);
  },
  processAdds: function processAdds() {
    if (matchMap.size > 0) {
      const allSelectors = Array.from(matchMap.keys()).join(',');
      document.querySelectorAll(allSelectors).forEach(function (elem) {
        matchMap.forEach(function (fns, selector) {
          if (elem.matches(selector)) {
            fns.forEach(function (fn) {
              const executedSet = executedMap.get(elem);
              if (!executedSet || !executedSet.has(fn)) {
                const set = executedSet || new Set();
                executedMap.set(elem, set.add(fn));
                fn(elem);
              }
            });
          }
        });
      });
    }
  },
  processRemoves: function processRemoves(mutations) {
    if (matchMap.size > 0) {
      mutations.forEach(function (mutation) {
        if (mutation.removedNodes.length > 0) {
          Array.from(removeMatchMap.entries()).forEach(function ([selector, removeFns]) {
            Array.from(mutation.removedNodes).forEach(function (node) {
              if (node.nodeType === 1) {
                const matchingNodes = new Set();
                if (node.matches(selector)) matchingNodes.add(node);
                Array.from(node.querySelectorAll(selector)).forEach(function (childNode) {
                  matchingNodes.add(node);
                });
                matchingNodes.forEach(function (node) {
                  removeFns.forEach(function (removeFn) { removeFn(node) });
                })
              }
            })
          });
        }
      });
    }
  }
}


window.addEventListener('DOMContentLoaded', (event) => {
  new MutationObserver((mutations, observer) => {
    requestAnimationFrame(function () {
      existo.processAdds();
      existo.processRemoves(mutations);
    })
    observer.takeRecords();
  }).observe(document.body, {
    attributes: true, childList: true, subtree: true
  });
});

// export default existo;

// existo.onAdd('p', (elem) => {
//   elem.dataset.foo = 'bar';
// })