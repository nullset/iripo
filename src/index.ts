import "requestidlecallback-polyfill"; // NOTE: Required for Safari support.
import { WKey } from "not-so-weak";

// Type definitions
export type IripoCallback = (element: Element) => void;
export type WatcherMap = Map<string, Set<symbol>>;
export type OutElemsMap = Map<string, Set<IripoCallback>>;

export interface Iripo {
  // State
  paused: boolean;
  processingQueued: boolean;
  pendingIdleCallback: number | null;
  domContentLoadedAdded: boolean;
  observer: MutationObserver | null;

  // Data structures
  allFns: Map<symbol, IripoCallback>;
  pausedFns: Map<symbol, boolean>;
  inWatchers: WatcherMap;
  outWatchers: WatcherMap;
  processedElems: WKey<Element, Set<symbol>>;
  outElems: WKey<Element, OutElemsMap>;

  // Internal methods
  getSymbol(selector: string, fn: IripoCallback): symbol | undefined;
  getFn(symbol: symbol): IripoCallback | undefined;
  setAction(selector: string, fn: IripoCallback, typeFns: WatcherMap): symbol;
  validateSelector(selector: string): boolean;
  buildOutFn(params: {
    elem: Element;
    selector: string;
    fn: IripoCallback;
  }): void;
  processInFns(mutations?: MutationRecord[]): void;
  processOutFns(mutations?: MutationRecord[]): void;

  // Public API
  in(selector: string, fn: IripoCallback, processNow?: boolean): symbol | null;
  out(selector: string, fn: IripoCallback): symbol | null;
  clear(symbol: symbol): void;
  destroy(): void;
  pause(symbol: symbol): symbol;
  pauseAll(): void;
  resume(symbol: symbol, processNow?: boolean): symbol;
  resumeAll(): void;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    iripo?: Iripo;
  }
}

// ES modules are singletons - this code only executes once per page load
// Reuse existing window.iripo if it exists (e.g., from a <script> tag)
const iripo: Iripo = (window.iripo as Iripo) || {
  paused: false,
  allFns: new Map<symbol, IripoCallback>(),
  pausedFns: new Map<symbol, boolean>(),
  inWatchers: new Map<string, Set<symbol>>(),
  outWatchers: new Map<string, Set<symbol>>(),
  processedElems: new WKey<Element, Set<symbol>>(),
  processingQueued: false,
  pendingIdleCallback: null,
  domContentLoadedAdded: false,
  observer: null,
  outElems: new WKey<Element, OutElemsMap>(),

  getSymbol(selector: string, fn: IripoCallback): symbol | undefined {
    const match = Array.from(iripo.allFns.entries()).find(([key, value]) =>
      key.description === selector && fn.toString() === value.toString()
    );
    return match?.[0];
  },

  getFn(symbol: symbol): IripoCallback | undefined {
    return iripo.allFns.get(symbol);
  },

  setAction(
    selector: string,
    fn: IripoCallback,
    typeFns: WatcherMap
  ): symbol {
    const actions = typeFns.get(selector) || new Set<symbol>();

    let fnId = iripo.getSymbol(selector, fn);

    if (!fnId) {
      fnId = Symbol(selector);
      iripo.allFns.set(fnId, fn);
      typeFns.set(selector, actions.add(fnId));
    }
    return fnId;
  },

  validateSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      console.error(
        "iripo: Invalid selector:",
        selector,
        (error as Error).message
      );
      return false;
    }
  },

  in(selector: string, fn: IripoCallback, processNow?: boolean): symbol | null {
    if (!iripo.validateSelector(selector)) return null;

    const id = iripo.setAction(selector, fn, iripo.inWatchers);
    if (processNow) iripo.processInFns();

    return id;
  },

  out(selector: string, fn: IripoCallback): symbol | null {
    if (!iripo.validateSelector(selector)) return null;

    return iripo.setAction(selector, fn, iripo.outWatchers);
  },

  clear(symbol: symbol): void {
    const userFn = iripo.allFns.get(symbol);

    // Clean processedElems
    iripo.processedElems.forEach((symbols: Set<symbol>, elem: Element) => {
      symbols.delete(symbol);
      if (symbols.size === 0) {
        iripo.processedElems.delete(elem);
      }
    });

    // Clean outElems
    if (userFn) {
      iripo.outElems.forEach((selectors: OutElemsMap, elem: Element) => {
        selectors.forEach((fns: Set<IripoCallback>, selector: string) => {
          fns.delete(userFn);
          if (fns.size === 0) {
            selectors.delete(selector);
          }
        });
        if (selectors.size === 0) {
          iripo.outElems.delete(elem);
        }
      });
    }

    // Remove from core maps
    iripo.allFns.delete(symbol);
    iripo.pausedFns.delete(symbol);
    [iripo.inWatchers, iripo.outWatchers].forEach((typeFns: WatcherMap) => {
      typeFns.forEach((actions: Set<symbol>, selector: string) => {
        actions.delete(symbol);
        // Remove empty Sets to prevent memory leak
        if (actions.size === 0) {
          typeFns.delete(selector);
        }
      });
    });
  },

  destroy(): void {
    // Cancel pending idle callback to prevent execution after cleanup
    if (iripo.pendingIdleCallback !== null) {
      cancelIdleCallback(iripo.pendingIdleCallback);
      iripo.pendingIdleCallback = null;
    }

    // Remove DOMContentLoaded listener if we added it
    if (iripo.domContentLoadedAdded) {
      window.removeEventListener('DOMContentLoaded', initializeObserver);
      iripo.domContentLoadedAdded = false;
    }

    if (iripo.observer) {
      iripo.observer.disconnect();
      iripo.observer = null;
    }

    iripo.allFns.clear();
    iripo.pausedFns.clear();
    iripo.inWatchers.clear();
    iripo.outWatchers.clear();
    iripo.processedElems.clear();
    iripo.outElems.clear();

    iripo.paused = false;
    iripo.processingQueued = false;
  },

  pause(symbol: symbol): symbol {
    iripo.pausedFns.set(symbol, true);
    return symbol;
  },

  pauseAll(): void {
    iripo.paused = true;
    iripo.allFns.forEach((_fn: IripoCallback, symbol: symbol) => {
      iripo.pause(symbol);
    });
  },

  resume(symbol: symbol, processNow: boolean = true): symbol {
    iripo.paused = false;
    iripo.pausedFns.delete(symbol);
    if (processNow) iripo.processInFns();

    return symbol;
  },

  resumeAll(): void {
    iripo.paused = false;
    iripo.allFns.forEach((_fn: IripoCallback, symbol: symbol) => {
      iripo.resume(symbol, false);
    });
    iripo.processInFns();
  },

  buildOutFn({ elem, selector, fn }: {
    elem: Element;
    selector: string;
    fn: IripoCallback;
  }): void {
    if (iripo.outElems.has(elem)) {
      const elemSelectors = iripo.outElems.get(elem)!;
      if (elemSelectors.has(selector)) {
        elemSelectors.get(selector)!.add(fn);
      } else {
        elemSelectors.set(selector, new Set([fn]));
      }
    } else {
      iripo.outElems.set(elem, new Map([[selector, new Set([fn])]]));
    }
  },

  processInFns(_mutations?: MutationRecord[]): void {
    if (iripo.inWatchers.size > 0) {
      const allSelectors = Array.from(iripo.inWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach((elem) => {
        iripo.inWatchers.forEach((fnIds, selector) => {
          if (elem.matches(selector)) {
            fnIds.forEach((symbol) => {
              if (!iripo.pausedFns.get(symbol)) {
                const processedInActions = iripo.processedElems.get(elem);
                if (!processedInActions || !processedInActions.has(symbol)) {
                  const fn = iripo.getFn(symbol);
                  const set = processedInActions || new Set<symbol>();

                  iripo.processedElems.set(elem, set.add(symbol));

                  iripo.buildOutFn({
                    elem,
                    selector,
                    fn: () => {
                      const set = iripo.processedElems.get(elem);
                      if (set) {
                        set.delete(symbol);
                        // Remove empty Sets to prevent memory leak
                        if (set.size === 0) {
                          iripo.processedElems.delete(elem);
                        }
                      }
                    },
                  });

                  try {
                    fn?.(elem);
                  } catch (error) {
                    console.error(
                      "Error in iripo 'in' callback for selector:",
                      selector,
                      error
                    );
                  }
                }
              }
            });
          }
        });
      });
    }

    if (iripo.outWatchers.size > 0) {
      const allSelectors = Array.from(iripo.outWatchers.keys()).join(",");
      document.querySelectorAll(allSelectors).forEach((elem) => {
        iripo.outWatchers.forEach((fnIds, selector) => {
          if (elem.matches(selector)) {
            fnIds.forEach((symbol) => {
              const fn = iripo.getFn(symbol);
              if (fn) {
                iripo.buildOutFn({ elem, selector, fn });
              }
            });
          }
        });
      });
    }
  },

  processOutFns(_mutations?: MutationRecord[]): void {
    iripo.outElems.forEach((selectors: OutElemsMap, elem: Element) => {
      selectors.forEach((fns: Set<IripoCallback>, selector: string) => {
        if (!elem.isConnected || !elem.matches(selector)) {
          fns.forEach((fn: IripoCallback) => {
            try {
              fn(elem);
            } catch (error) {
              console.error(
                "Error in iripo 'out' callback for selector:",
                selector,
                error
              );
            }
          });
          selectors.delete(selector);
        }
      });
      if (selectors.size === 0) {
        iripo.outElems.delete(elem);
      }
    });
  },
};

// Set on window for backward compatibility and global access
window.iripo = iripo;

// Observer initialization function (can be called after destroy)
const initializeObserver = () => {
  if (iripo.observer) return; // Already initialized

  if (!iripo.paused) iripo.processInFns();

  const watchMutations = (mutations: MutationRecord[]) => {
    if (iripo.paused || iripo.processingQueued) return;
    iripo.processingQueued = true;

    iripo.pendingIdleCallback = requestIdleCallback(
      () => {
        iripo.processInFns(mutations);
        iripo.processOutFns(mutations);
        iripo.processingQueued = false;
        iripo.pendingIdleCallback = null;
      },
      { timeout: 1000 }
    );
  };

  iripo.observer = new MutationObserver(watchMutations);
  iripo.observer.observe(document.documentElement || document.body, {
    attributes: true,
    attributeOldValue: true,
    childList: true,
    subtree: true,
  });
};

// Initialize immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeObserver);
  iripo.domContentLoadedAdded = true;
} else {
  initializeObserver();
}

export default iripo;
export { initializeObserver };
