const matchMap = window.matchMap = new Map();
const removeMatchMap = window.removeMatchMap = new Map();

const executedMap = window.executedMap = new WeakMap();

function existo(selector, addFn, removeFn) {
  const selectorActions = matchMap.get(selector) || new Set();
  matchMap.set(selector, selectorActions.add(addFn));
  processAdds();

  if (removeFn) {
    const removeSelectorActions = removeMatchMap.get(selector) || new Set();
    removeMatchMap.set(selector, removeSelectorActions.add(removeFn));
    // Removes are not processed on creation, as it doesn't make sense to do so.
  }
}

const existo2 = window.existo2 = {
  onAdd: (selector, fn, opts = { process: true }) => {
    const selectorActions = matchMap.get(selector) || new Set();
    matchMap.set(selector, selectorActions.add(fn));
    if (opts.process) processAdds();
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

// Object.defineProperty('remove')

existo('p', (elem) => {
  elem.dataset.time = Date()
}, (elem) => {
  debugger;
});

existo('p[data-time]', (elem) => {
  elem.dataset.foo = 'foo'
})

existo2.onAdd('p', (elem) => {
  elem.dataset.num2 = 'blah';
})


function processAdds() {
  console.log('processing adds')
  const allSelectors = Array.from(matchMap.keys()).join(',');
  document.querySelectorAll(allSelectors).forEach((elem) => {
    matchMap.forEach((fns, selector) => {
      if (elem.matches(selector)) {
        fns.forEach((fn) => {
          // fn(elem);
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
  // debugger
  // // requestAnimationFrame(() => {
  //   console.log('anim')
  //   matchMap.forEach((fns, selector) => {
  //     document.querySelectorAll(selector).forEach((elem) => {
  //       fns.forEach((fn) => {
  //         // fn(elem);
  //         const executedSet = executedMap.get(elem);
  //         if (!executedSet || !executedSet.has(fn)) {
  //           const set = executedSet || new Set();
  //           executedMap.set(elem, set.add(fn));
  //           fn(elem);
  //         }
  //       });
  //     });
  //   // });
  //   // process()111`;
  // });
}

function processRemoves(mutations) {
  mutations.forEach((mutation) => {
    if (mutation.removedNodes.length > 0) {
      console.log(mutation)
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
