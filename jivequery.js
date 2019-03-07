const matchMap = window.matchMap = new Map();

const executedMap = window.executedMap = new WeakMap();

function existo(selector, fn) {
  console.log('existo', selector)
  const selectorActions = matchMap.get(selector) || new Set();
  matchMap.set(selector, selectorActions.add(fn));
  process();
  // if (selectorMatch) {
  //   selectorMatch.add(fn);
  //   matchMap.set(selector, selectorMatch);
  // } else {
  //   matchMap.set(selector, [fn]);
  // }
}

existo('p', (elem) => {
  elem.dataset.time = Date()
});

existo.remove = (selector, fn) => {
  // matchMap.
}



function process() {
  console.log('processing')
  // requestAnimationFrame(() => {
    console.log('anim')
    matchMap.forEach((fns, selector) => {
      document.querySelectorAll(selector).forEach((elem) => {
        fns.forEach((fn) => {
          // fn(elem);
          const executedSet = executedMap.get(elem);
          if (!executedSet || !executedSet.has(fn)) {
            const set = executedSet || new Set();
            executedMap.set(elem, set.add(fn));
            fn(elem);
          }
        });
      });
    // });
    // process()111`;
  });
}

const obs = new MutationObserver((mutations, obsverver) => {
  process();
  obsverver.takeRecords();
});

obs.observe(document.body, {
  attributes: true, childList: true, subtree: true
})
