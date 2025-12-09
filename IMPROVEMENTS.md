# Iripo Code Improvements Checklist

## Completed ✓

### TypeScript Conversion
- [x] **Convert codebase from JavaScript to TypeScript**
  - Created `tsconfig.json` with strict type checking enabled
  - Converted `src/index.js` to `src/index.ts` with full type definitions
  - Created `src/not-so-weak.d.ts` for dependency types
  - All methods and callbacks fully typed
  - Export types: `IripoCallback`, `WatcherMap`, `OutElemsMap`, `Iripo` interface
  - Extended `Window` interface for `window.iripo`
  - Size impact: 5.8KB minified ESM (includes not-so-weak)
  - No breaking changes - fully backward compatible API

- [x] **Switch build system from Vite to Bun**
  - Updated package.json with Bun build scripts
  - ESM-only output (no UMD)
  - Generates TypeScript declarations (.d.ts files)
  - Source maps for both JS and declarations
  - Much faster builds with native TypeScript support
  - Build output:
    - `dist/index.js`: 5.8KB minified ESM bundle
    - `dist/index.js.map`: 23KB source map
    - `dist/index.d.ts`: 1.5KB TypeScript declarations
    - `dist/index.d.ts.map`: 1.8KB declaration source map

### Critical Memory Leaks
- [x] **Issue #1**: `clear()` doesn't remove symbols from `processedElems`
  - Fixed by using WKey (iterable) and cleaning up in clear() method
  - Location: src/index.ts:129-135

- [x] **Issue #2**: `clear()` doesn't clean `outElems`
  - Fixed by iterating outElems and removing functions in clear() method
  - Location: src/index.ts:137-149

- [x] **Issue #6**: `outElems` uses strong references to DOM elements
  - Fixed by replacing Map with WKey for automatic garbage collection
  - Location: src/index.ts:65

### Dependencies
- [x] Add `not-so-weak` dependency for iterable weak collections
  - Enables iteration over WeakMap-like structures
  - Provides automatic GC for disconnected DOM elements
  - Size impact: +0.44KB brotli compressed (1KB → 1.44KB)

### Documentation
- [x] Remove IE11 support from README
  - Updated browser requirements to specify WeakRef/FinalizationRegistry
  - Location: README.md:76-80

### Module System
- [x] **ES Module Singleton Pattern**
  - Added default export for modern import syntax
  - Leverages ES module singleton behavior (code only executes once)
  - Prevents duplicate MutationObservers if imported multiple times
  - Maintains backward compatibility with `window.iripo`
  - Locations:
    - src/index.ts:56 - Reuse existing instance check
    - src/index.ts:307 - window.iripo assignment
    - src/index.ts:310 - Prevent duplicate observer initialization
    - src/index.ts:338 - Default export
  - Size impact: ~20 bytes brotli compressed

---

## Not Bugs / Intentional Behavior

- [ ] ~~**Issue #3**: `resume(symbol)` sets global pause flag~~
  - This is intentional behavior (Option B)
  - Allows resumed functions to process future mutations
  - No change needed

---

## Remaining Issues to Address

### High Priority

- [x] **Issue #4**: No destroy/cleanup API
  - Added `destroy()` method to disconnect MutationObserver
  - Clears all Maps/Sets
  - Critical for SPAs and component lifecycle management
  - Location: src/index.ts:162-177, observer stored at line 64, 310
  - Size impact: +60 bytes brotli compressed

- [x] **Issue #5**: Missing error handling in user callbacks
  - Wrapped user callback invocations in try-catch
  - Prevents one broken callback from stopping all processing
  - Errors logged to console with selector context
  - Locations:
    - src/index.ts:247-255 - "in" watcher callbacks in processInFns
    - src/index.ts:286-294 - "out" watcher callbacks in processOutFns
  - Size impact: +50 bytes brotli compressed

### Medium Priority

- [ ] **Performance**: Inefficient selector building
  - Cache selector strings instead of rebuilding on every mutation
  - Invalidate cache when watchers change
  - Locations: src/index.ts:226, 265

- [x] **Code Quality**: Inconsistent return values
  - Analyzed current pattern: single-symbol methods return symbol, global methods return undefined
  - **Decision:** Keep current pattern - it's logical (symbols returned when you'll use them again)
  - `clear()` returns nothing because symbol is useless after clearing
  - No changes needed

- [x] **Robustness**: Selector validation
  - Added `validateSelector()` helper function
  - Validates selectors at registration time (fail fast)
  - Invalid selectors logged to console and not registered
  - Prevents runtime crashes from bad selectors
  - Returns `null` when selector is invalid
  - Locations:
    - src/index.ts:97-108 - validateSelector() function
    - src/index.ts:112 - validation in in()
    - src/index.ts:121 - validation in out()
  - Size impact: +60 bytes brotli compressed

### Low Priority

- [ ] **API Design**: No way to query current state
  - Add methods like `isPaused()`, `isPaused(symbol)`, `getWatchers()` etc.
  - Useful for debugging and testing

- [ ] **Performance**: querySelectorAll on entire document
  - Called on every mutation for all selectors
  - Could be expensive with many selectors/elements
  - Consider more targeted queries or caching strategies

---

## Future Enhancements (Optional)

- [ ] **Feature**: Support for custom MutationObserver options per watcher
  - Currently uses fixed options (attributes, childList, subtree)
  - Could allow more granular control

- [ ] **Feature**: Debouncing/throttling options
  - Currently uses requestIdleCallback with 1000ms timeout
  - Could make timeout configurable

- [ ] **Feature**: Support for multiple instances
  - Currently uses global `window.iripo`
  - Could export a factory function for isolated instances

- [ ] **Testing**: Add automated tests
  - No test suite currently exists
  - Critical for preventing regressions

---

## Notes

- Original bundle size: ~1KB brotli compressed (JavaScript)
- Current bundle size: ~1.7KB brotli compressed, 5.8KB minified uncompressed (TypeScript → ESM)
- Includes: memory leak fixes, automatic GC, destroy API, error handling, ES module support, selector validation, and full TypeScript type definitions
- TypeScript benefits: compile-time type safety, better IDE support, self-documenting code
- Build system: Bun (faster builds, native TypeScript support)
- Output: ESM-only with TypeScript declarations (.d.ts files)
