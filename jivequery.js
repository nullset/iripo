const matchMap = window.matchMap = new Map();

const executedMap = window.executedMap = new WeakMap();

function existo(selector, fn) {
  const selectorMatch = matchMap.get(selector);
  if (selectorMatch) {
    selectorMatch.push(fn);
    matchMap.set(selector, selectorMatch);
  } else {
    matchMap.set(selector, [fn]);
  }
}

existo('p', (elem) => {
  console.log('--- found', elem)
});



function process() {
  console.log('processing')
  requestAnimationFrame(() => {
    console.log('anim')
    matchMap.forEach((fns, selector) => {
      document.querySelectorAll(selector).forEach((elem) => {
        fns.forEach((fn) => {
          // fn(elem);
          const executedSet = executedMap.get(elem);
          if (executedSet && executedSet.has(fn)) {
            // DO NOTHING
          } else {
            const set = executedSet || new Set();
            executedMap.set(elem, set.add(fn));
            fn(elem);
          }
        });
      });
    });
    // process()111`;
  });
}

const obs = new MutationObserver(() => {
  process();
});

obs.observe(document.body, {
  attributes: true, childList: true, subtree: true
})
