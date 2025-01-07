# Iripo

_(pronounced "ee-ree-po")_

A tiny (~1Kb minified, single dependency) jquery livequery replacement, built with all the hearty goodness and performance of MutationObserver. Any change to the `<html>` element or any children (`<head>`, `<body>`, or child elements within those nodes) will trigger Iripo. Iripo will only run callback functions when matching elements have appeared or disappeared from the page, and only run when the browser is idle, so as to increase performance.

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


## Browser support

Iripo works with all modern browsers (Chrome, Firefox, Chromium-based Edge, Opera, Vivaldi, Safari).

Iripo can easily be made to work with Internet Explorer 11 by including [core-js](https://github.com/zloirock/core-js).

## What's up with the name "Iripo"?

It is a Shona word. Depending on the context, the word _iripo_ (pronounced "ee-ree-po") can mean "is it there?" or "there it is", which seemed like an appropriate name for a library that detects and reacts to something if it exists.
