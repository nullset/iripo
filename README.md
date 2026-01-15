# Iripo

_(pronounced "ee-ree-po")_

A (~1Kb minified, single dependency) jquery livequery replacement, built with all the hearty goodness and performance of MutationObserver. Any change to the `<html>` element or any children (`<head>`, `<body>`, or child elements within those nodes) will trigger Iripo. Iripo will only run callback functions when matching elements have appeared or disappeared from the page, and only run when the browser is idle, so as to increase performance.

**NOTE:** Iripo will intentionally _not_ run when text has been changed on the page, only when actual DOM nodes have been altered.

## Usage

1. Include iripo in your build `npm install iripo` or `yarn add iripo`.

2. Run a callback function when a matching element is added to the page: (can use any native javascript selector)

   ```javascript
   iripo.in("p.my-class", (element) => {
     console.log("my element", element);
   });
   ```

   By default all `in` callbacks will be run once the page is first loaded (when `DOMContentLoaded` fires), and then again when any new matching element is added to the page.

   If you want to ensure that a callback is run immediately (for example, to run a callback on a pre-existing element on the page) you can pass the `processNow` option to the `in` function like so:

   ```javascript
   iripo.in(
     "p.my-class",
     (element) => {
       console.log("my element", element);
     },
     true // Process the callback immediately after instantiation
   );
   ```

   This callback will immediately execute against any matching element, without waiting for any new elements to appear. It will also listen for new matching elements and run again once any new matching element is found.

3. Run a callback function when a matching element is removed from the page: (can use any native javascript selector)

   ```javascript
   iripo.out("button#some-id", (element) => {
     console.log("my element", element);
   });
   ```

4. Pause all callback functions:

   ```javascript
   iripo.pauseAll();
   ```

   or just pause a specific one by calling `pause` and passing in a specific selector:

   ```javascript
   iripo.pause("button.my-class");
   ```

5. Resume all callback functions:

   ```javascript
   iripo.resumeAll();
   ```

   or just resume a specific one by calling `resume` and passing in a specific selector:

   ```javascript
   iripo.resume("button");
   ```

6. Clear a callback function to prevent it from ever running again:

   ```javascript
   iripo.clear("button");
   ```

## How Iripo Processes DOM Changes

Iripo uses `requestIdleCallback` to defer processing until the browser is idle, improving performance by avoiding work during critical rendering time.

**Important behavioral notes:**

- **Iripo checks current DOM state, not mutation history.** When the idle callback fires, Iripo runs `querySelectorAll` to see what currently matches selectors. It does not process individual mutation records.

- **Rapid DOM changes may not retrigger callbacks.** If an element is removed and re-added to the DOM before the idle callback fires, Iripo will see it as "never left" and the `in()` callback will not run again.

  ```javascript
  // Example: Element moved through a DocumentFragment
  const div = document.createElement('div');
  div.className = 'test';
  document.body.appendChild(div);  // Callback runs

  const fragment = document.createDocumentFragment();
  fragment.appendChild(div);       // Remove from DOM
  document.body.appendChild(div);   // Re-add to DOM
  // If this happens before idle callback: callback does NOT run again
  ```

- **Elements maintain their identity.** If an element is removed from the DOM (including moved to a DocumentFragment where `elem.isConnected` is `false`) and the idle callback fires, the `out()` callback will run. When the element is re-added later, the `in()` callback will run again because cleanup has already occurred.

- **Performance tradeoff:** This approach (one `querySelectorAll` vs. processing individual mutations) is much faster when you have many selectors or frequent DOM changes, but means you observe "current state" rather than "all state changes."

## Browser support

Iripo works with all modern browsers that support `WeakRef` and `FinalizationRegistry` (Chrome 84+, Firefox 79+, Safari 14.1+, Edge 84+, Opera 70+).

**Note:** Internet Explorer 11 is no longer supported.

## What's up with the name "Iripo"?

It is a Shona word. Depending on the context, the word _iripo_ (pronounced "ee-ree-po") can mean "is it there?" or "there it is", which seemed like an appropriate name for a library that detects and reacts to something if it exists.
