declare module 'not-so-weak' {
  export class WKey<K extends object, V> extends Map<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null);
    get size(): number;
    delete(key: K): boolean;
    has(key: K): boolean;
    clear(): void;
    forEach(
      callbackfn: (value: V, key: K, map: Map<K, V>) => void,
      thisArg?: any
    ): void;
    get(key: K): V | undefined;
    set(key: K, value: V, cleanup?: (value: V) => void): this;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
  }

  export class WSet<T extends object> extends Set<T> {
    constructor(values?: readonly T[] | null);
  }

  export class WValue<K, V extends object> extends Map<K, V> {
    constructor(entries?: readonly (readonly [K, V])[] | null);
  }
}
