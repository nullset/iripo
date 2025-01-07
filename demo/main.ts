import { render, html, signal } from "uhtml/preactive";

import "../src/index";
console.log("Iripo instance:", window.iripo);

import { render } from "solid-js/web";
import { createSignal } from "solid-js";

function Counter() {
  return <div>Count: 0</div>;
}

render(() => <Counter />, document.getElementById("app"));

class ControlForm extends HTMLElement {
  static formAssociated = true;
  #internals;
  #shadow;

  #count = signal(0);

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#shadow = this.attachShadow({ mode: "open" });

    render(
      this.#shadow,
      () => html`
        <style>
          #form {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            p {
              grid-column: span 2;
            }
          }
          label {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            button {
              margin-left: auto;
            }
            textarea {
              min-height: 5rem;
            }
          }
        </style>
        <h1>Iripo Demo</h1>
        <div id="form">
          <p>
            Add watcher/watchers within the "watcher" section, then add some
            matching HTML within the "add elements" section.
          </p>
          <form id="watcher-form">
            <label for="watcher">
              <div>Watcher</div>
              <textarea name="watcher">
iripo.in('button', node => {alert()})
            </textarea
              >
              <button type="submit">Create watcher</button>
            </label>
          </form>
          <form id="html-form">
            <label for="html">
              <div>Add elements</div>
              <textarea name="html"></textarea>
              <button type="submit">Create HTML</button>
            </label>
          </form>
        </div>
        <header>
          <h2>Generated elements</h2>
          <button type="reset">Clear all</button>
        </header>
        <button
          onclick=${() => {
            this.#count.value++;
          }}
        >
          Clicks: ${this.#count.value}
        </button>
      `
    );
  }
}

customElements.define("control-form", ControlForm);
