import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

function ControlFormComponent() {
  const [watcher, setWatcher] = createSignal(`iripo.in('button#demo', node => {
  node.style.backgroundColor = 'rebeccapurple';
});
iripo.out('button#demo', node => {
  alert('Demo button removed');
});`);
  const [html, setHtml] = createSignal(
    `<button id="demo">Demo button</button>`
  );

  const watcherPlaceholder = watcher();
  const htmlPlaceholder = html();

  function addWatcher(e: Event) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const watcher = data.get("watcher") as string;
    new Function(String(watcher))();
    setWatcher("");
  }

  function addHTML(e: Event) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const html = data.get("html") as string;
    document.body.insertAdjacentHTML("beforeend", html);
    setHtml("");
  }

  function clearHTML() {
    const frag = document.createDocumentFragment();
    const controlFormElem = document.querySelector("control-form");
    if (controlFormElem) {
      frag.appendChild(controlFormElem);
    }
    document.body.innerHTML = "";
    document.body.appendChild(frag);
  }

  return (
    <>
      <style>
        {`
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
    min-height: 6rem;
  }
}
hr {
  margin: 2rem 0;
}
`}
      </style>

      <h1>Iripo Demo</h1>
      <div id="form">
        <p>
          Add watcher within the "watcher" section with some behavior that takes
          place when a matching element is added/removed, then add some matching
          HTML within the "add elements" section.
        </p>
        <form id="watcher-form" on:submit={addWatcher}>
          <label for="watcher">
            <div>Watcher</div>
            <textarea
              id="watcher"
              name="watcher"
              placeholder={watcherPlaceholder}
            >
              {watcher()}
            </textarea>
            <button type="submit">Create watcher</button>
          </label>
        </form>
        <form id="html-form" on:submit={addHTML}>
          <label for="html">
            <div>Add elements</div>
            <textarea id="html" name="html" placeholder={htmlPlaceholder}>
              {html()}
            </textarea>
            <button type="submit">Create HTML</button>
          </label>
        </form>
      </div>
      <header>
        <h2>Generated elements</h2>
        <button type="reset" on:click={clearHTML}>
          Clear all
        </button>
      </header>
      <hr />
      <div id="output">
        <slot></slot>
      </div>
    </>
  );
}

class ControlForm extends HTMLElement {
  static formAssociated = true;
  #internals;
  #shadow;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#shadow = this.attachShadow({ mode: "open" });

    render(() => <ControlFormComponent />, this.#shadow);
  }
}

customElements.define("control-form", ControlForm);
