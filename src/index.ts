// Set the `iripo` global variable on the window object.
declare global {
  interface Window {
    iripo: IripoAPI;
  }
}

type Callback = () => void;
type Watcher = Map<string, Set<symbol>>;

// 2. Define the public API interface
export interface IripoAPI {
  // Add your methods here
  paused: boolean;
}

// 3. Create the implementation
class Iripo implements IripoAPI {
  private static instance: Iripo | null = null;

  public paused: boolean = false;
  public allFns = new Map();
  public pausedFns = new Map();
  public inWatchers = new Map();
  public outWatchers = new Map();
  public processedElems = new WeakMap();
  public processingQueued = false;
  public outElems = new Map(); // Elements which are observed for changes (out functions)

  getSymbol(fn: Callback) {
    const match = Array.from(this.allFns.entries()).find((entry) => {
      if (fn.toString() === entry[1].toString()) {
        return true;
      }
    });
    return match && match[0];
  }

  getFn(symbol: symbol) {
    return this.allFns.get(symbol);
  }

  setAction(selector: string, fn: Callback, watcherType: Watcher) {
    const actions = watcherType.get(selector) || new Set();

    let fnId = this.getSymbol(fn);

    if (!fnId) {
      fnId = Symbol();
      this.allFns.set(fnId, fn);
      watcherType.set(selector, actions.add(fnId));
    }
    return fnId;
  }

  in(selector: string, fn: Callback, processNow: boolean = false) {
    const id = this.setAction(selector, fn, this.inWatchers);
    if (processNow) this.processInFns();

    return id;
  }

  out(selector: string, fn: Callback) {
    return this.setAction(selector, fn, this.outWatchers);
  }

  clear(symbol: symbol) {
    this.allFns.delete(symbol);
    this.pausedFns.delete(symbol);
    [this.inWatchers, this.outWatchers].forEach(function (watcherType) {
      watcherType.forEach(function (actions) {
        actions.delete(symbol);
      });
    });
  }

  pause(symbol: symbol) {
    this.pausedFns.set(symbol, true);
    return symbol;
  }

  pauseAll() {
    this.paused = true;
    this.allFns.forEach((_, symbol) => {
      this.pause(symbol);
    });
  }

  resume(symbol: symbol, processNow: boolean = true) {
    this.paused = false;
    this.pausedFns.delete(symbol);
    if (processNow) this.processInFns();

    return symbol;
  }

  resumeAll() {
    this.paused = false;
    this.allFns.forEach((_, symbol) => {
      this.resume(symbol, false);
    });
    this.processInFns();
  }

  buildOutFn({
    elem,
    selector,
    fn,
  }: {
    elem: Element;
    selector: string;
    fn: Callback;
  }) {
    if (this.outElems.has(elem)) {
      if (this.outElems.get(elem).has(selector)) {
        this.outElems.get(elem).get(selector).add(fn);
      } else {
        this.outElems.get(elem).set(selector, new Set([fn]));
      }
    } else {
      this.outElems.set(elem, new Map([[selector, new Set([fn])]]));
    }
  }

  processInFns() {
    if (this.inWatchers.size > 0) {
      const allSelectors = Array.from(this.inWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach((elem) => {
        this.inWatchers.forEach((fnIds, selector) => {
          if (elem.matches(selector)) {
            fnIds.forEach((symbol: symbol) => {
              if (!this.pausedFns.get(symbol)) {
                const processedInActions = this.processedElems.get(elem);
                if (!processedInActions || !processedInActions.has(symbol)) {
                  const fn = this.getFn(symbol);
                  const set = processedInActions || new Set();

                  this.processedElems.set(elem, set.add(symbol));

                  // If the matching element is ever un-matched (ex. a class changes) then
                  // remove the element from the processedElems set, so that if it is ever
                  // re-added (ex. class changes back) then it will be run again.
                  this.buildOutFn({
                    elem,
                    selector,
                    fn: () => {
                      this.processedElems.get(elem)?.delete(symbol);
                    },
                  });

                  fn(elem);
                }
              }
            });
          }
        });
      });
    }

    if (this.outWatchers.size > 0) {
      const allSelectors = Array.from(this.outWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach((elem) => {
        this.outWatchers.forEach((fnIds, selector) => {
          if (elem.matches(selector)) {
            fnIds.forEach((symbol: symbol) => {
              const fn = this.getFn(symbol);
              this.buildOutFn({ elem, selector, fn });
            });
          }
        });
      });
    }
  }

  processOutFns() {
    Array.from(this.outElems.entries()).forEach(([elem, selectors]) => {
      selectors.entries().forEach(([selector, fns]: [string, Function[]]) => {
        if (!elem.isConnected || !elem.matches(selector)) {
          fns.forEach((fn) => fn(elem));
          this.outElems.get(elem).delete(selector);
        }
        if (!this.outElems.get(elem).size) {
          this.outElems.delete(elem);
        }
      });
    });
  }

  // Private constructor to prevent 'new' operator
  private constructor() {
    if (typeof window !== "undefined" && window.iripo) {
      throw new Error("Iripo is already initialized");
    }
  }

  // Static method to get or create the instance
  public static getInstance(): Iripo {
    if (typeof window !== "undefined" && window.iripo) {
      return window.iripo as Iripo;
    }

    if (!Iripo.instance) {
      Iripo.instance = new Iripo();

      if (typeof window !== "undefined") {
        Object.defineProperty(window, "iripo", {
          value: Iripo.instance,
          configurable: false,
          writable: false,
        });

        window.addEventListener(
          "DOMContentLoaded",
          function handleDOMContentLoaded() {
            const iripo = Iripo.instance as Iripo;

            // Run any initial `in` calls.
            if (!iripo.paused) iripo.processInFns();

            // Watch the page for any mutations. If they occur, requset that the browser run mutations during the next idle period.
            // If the idle period has not yet happened, do nothing, as all mutation functions run once the browser is idle.
            function watchMutations() {
              if (iripo.paused || iripo.processingQueued) return;
              iripo.processingQueued = true;

              // Have to use polyfill for Safari since it does not support `requestIdleCallback` natively.
              requestIdleCallback(
                function handleRequestIdleCallback() {
                  iripo.processInFns();
                  iripo.processOutFns();
                  iripo.processingQueued = false;
                },
                { timeout: 1000 }
              );
            }

            new MutationObserver(watchMutations).observe(
              document.documentElement || document.body,
              {
                attributes: true,
                attributeOldValue: true,
                childList: true,
                subtree: true,
              }
            );
          }
        );
      }
    }

    return Iripo.instance;
  }
}

// 4. Create and export the singleton instance
const instance = Iripo.getInstance();

// 5. Default export is just for module completeness
// Users should not use this, as it will always reference window.iripo
export default instance;
