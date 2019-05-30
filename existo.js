const matchMap = window.matchMap = new Map();
const removeMatchMap = window.removeMatchMap = new Map();
const executedMap = window.executedMap = new WeakMap();

const existo = window.existo = {
  onAdd: (selector, fn, opts = { processNow: true }) => {
    const selectorActions = matchMap.get(selector) || new Set();
    matchMap.set(selector, selectorActions.add(fn));
    if (opts.processNow) processAdds();
  },
  onRemove: (selector, fn) => {
    const removeSelectorActions = removeMatchMap.get(selector) || new Set();
    removeMatchMap.set(selector, removeSelectorActions.add(fn));
  },
  clearFn: (elemMap, selector, fn) => {
    const fns = elemMap.get(selector);
    if (typeof fn === 'function') {
      fns.delete(fn);
    } else {
      elemMap.set(selector, Array.from(fns).filter(matchFn => matchFn.toString() !== fn.toString()))
    }

  },
  clearAdd: (selector, fn) => {
    existo2.clearFn(matchMap, selector, fn);
  },
  clearRemove: (selector, fn) => {
    existo2.clearFn(removeMatchMap, selector, fn);
  }
}

function processAdds() {
  if (matchMap.size > 0) {
    const allSelectors = Array.from(matchMap.keys()).join(',');
    document.querySelectorAll(allSelectors).forEach((elem) => {
      matchMap.forEach((fns, selector) => {
        if (elem.matches(selector)) {
          fns.forEach((fn) => {
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
}

function processRemoves(mutations) {
  if (matchMap.size > 0) {
    mutations.forEach((mutation) => {
      if (mutation.removedNodes.length > 0) {
        Array.from(removeMatchMap.entries()).forEach(([selector, removeFns]) => {
          Array.from(mutation.removedNodes).forEach((node) => {
            if (node.nodeType === 1) {
              const matchingNodes = new Set();
              if (node.matches(selector)) matchingNodes.add(node);
              Array.from(node.querySelectorAll(selector)).forEach((childNode) => {
                matchingNodes.add(node);
              });
              matchingNodes.forEach((node) => {
                removeFns.forEach((removeFn) => removeFn(node));
              })
            }
          })
        });
      }
    });
  }
}

const obs = new MutationObserver((mutations, observer) => {
  requestAnimationFrame(() => {
    processAdds();
    processRemoves(mutations);
  })
  observer.takeRecords();
});

obs.observe(document.body, {
  attributes: true, childList: true, subtree: true
})
