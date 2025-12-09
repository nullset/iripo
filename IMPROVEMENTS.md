# Iripo Code Improvements Checklist

## Completed ✓

### Critical Memory Leaks
- [x] **Issue #1**: `clear()` doesn't remove symbols from `processedElems`
  - Fixed by using WKey (iterable) and cleaning up in clear() method
  - Location: src/index.js:52-58

- [x] **Issue #2**: `clear()` doesn't clean `outElems`
  - Fixed by iterating outElems and removing functions in clear() method
  - Location: src/index.js:60-73

- [x] **Issue #6**: `outElems` uses strong references to DOM elements
  - Fixed by replacing Map with WKey for automatic garbage collection
  - Location: src/index.js:13

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
    - src/index.js:6 - Reuse existing instance check
    - src/index.js:228 - window.iripo assignment
    - src/index.js:231 - Prevent duplicate observer initialization
    - src/index.js:270 - Default export
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
  - Location: src/index.js:85-103, observer stored at line 12, 230-231
  - Size impact: +60 bytes brotli compressed

- [x] **Issue #5**: Missing error handling in user callbacks
  - Wrapped user callback invocations in try-catch
  - Prevents one broken callback from stopping all processing
  - Errors logged to console with selector context
  - Locations:
    - src/index.js:166-174 - "in" watcher callbacks in processInFns
    - src/index.js:203-213 - "out" watcher callbacks in processOutFns
  - Size impact: +50 bytes brotli compressed

### Medium Priority

- [ ] **Performance**: Inefficient selector building
  - Cache selector strings instead of rebuilding on every mutation
  - Invalidate cache when watchers change
  - Locations: src/index.js:121, 156

- [ ] **Code Quality**: Inconsistent return values
  - `in()` returns symbol
  - `out()` returns symbol
  - `pause()` returns symbol
  - `pauseAll()` returns nothing
  - `resume()` returns symbol
  - `resumeAll()` returns nothing
  - Decision: Make all methods return symbol or undefined consistently

- [ ] **Robustness**: No selector validation
  - Invalid selectors throw errors from querySelectorAll
  - Add try-catch or validation
  - Locations: src/index.js:122, 157

### Low Priority

- [ ] **Code Quality**: Update comment at line 1
  - Says "Required for Safari and IE11 support"
  - Should be "Required for Safari support" only
  - Already fixed in import line, but may exist elsewhere

- [ ] **API Design**: No way to query current state
  - Add methods like `isPaused()`, `isPaused(symbol)`, `getWatchers()` etc.
  - Useful for debugging and testing

- [ ] **Performance**: querySelectorAll on entire document
  - Called on every mutation for all selectors
  - Could be expensive with many selectors/elements
  - Consider more targeted queries or caching strategies

- [ ] **Code Quality**: Add JSDoc or TypeScript definitions
  - No type information for users
  - Improves IDE autocomplete and documentation

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

- Original bundle size: ~1KB brotli compressed
- Current bundle size: ~1.57KB brotli compressed (ES: 4.88 KiB, UMD: 5.24 KiB)
- Acceptable tradeoff for memory leak fixes, automatic GC, destroy API, error handling, and ES module support
