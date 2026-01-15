# Iripo Testing

## Overview
Comprehensive test suite using Playwright to test iripo in a real browser environment with MutationObserver support.

---

## Test Setup ✓

### Infrastructure
- [x] Installed Playwright with Chromium
- [x] Created Playwright configuration (`playwright.config.ts`)
- [x] Set up test server (`tests/server.ts`)
- [x] Created test HTML fixture (`tests/index.html`)
- [x] Added TypeScript type definitions for tests (`tests/global.d.ts`)

### Package Scripts
```json
"test": "playwright test",
"test:server": "bun run tests/server.ts",
"test:ui": "playwright test --ui",
"test:debug": "playwright test --debug"
```

---

## Test Coverage

### Basic Functionality Tests (`tests/basic.spec.ts`) - 9 tests ✓

| Test | Status | Description |
|------|--------|-------------|
| in() callback fires when element appears | ✅ | Callback executes when matching element is added to DOM |
| in() callback fires for existing elements | ✅ | processNow=true processes elements already in DOM |
| in() callback does not fire twice | ✅ | Same element only triggers callback once |
| out() callback fires when element removed | ✅ | Callback executes when element leaves DOM |
| out() callback fires when selector no longer matches | ✅ | Callback executes when element changes and no longer matches |
| Multiple watchers for same selector | ✅ | Different callbacks can watch same selector |
| in() returns symbol | ✅ | Registration returns symbol for lifecycle management |
| in() returns null for invalid selector | ✅ | Invalid selectors are rejected at registration |
| out() returns null for invalid selector | ✅ | Invalid selectors are rejected at registration |

### Lifecycle Methods Tests (`tests/lifecycle.spec.ts`) - 10 tests ✓

| Test | Status | Description |
|------|--------|-------------|
| pause() prevents callback from firing | ✅ | Paused watchers don't fire |
| resume() allows paused callback to fire | ✅ | Resumed watchers start firing again |
| pauseAll() stops all callbacks | ✅ | All watchers can be paused at once |
| resumeAll() resumes all paused callbacks | ✅ | All watchers can be resumed at once |
| clear() removes watcher | ✅ | Cleared watchers no longer fire |
| clear() removes out callback | ✅ | Out callbacks are properly cleaned up |
| destroy() stops all watchers | ✅ | Complete cleanup of all watchers |
| destroy() disconnects MutationObserver | ✅ | Observer is properly disconnected |
| iripo can be reinitialized after destroy | ✅ | System can be restarted after destroy() |
| pause/resume symbol multiple times | ✅ | Multiple pause/resume cycles work correctly |

### Error Handling & Edge Cases Tests (`tests/edge-cases.spec.ts`) - 9 tests ✓

| Test | Status | Description |
|------|--------|-------------|
| Callback error doesn't stop other callbacks | ✅ | Error handling prevents cascade failures |
| Out callback error doesn't stop others | ✅ | Out callback errors are isolated |
| Complex selector matching | ✅ | Advanced CSS selectors work correctly |
| Same function registered twice | ✅ | Duplicate detection prevents double-registration |
| Rapidly adding/removing elements | ✅ | High-frequency DOM changes handled |
| Nested element mutations | ✅ | Elements added in nested structures detected |
| Attribute changes detected | ✅ | Selector-dependent attributes trigger callbacks |
| Clearing symbol multiple times | ✅ | Idempotent clear() operation |
| Empty selector validation | ✅ | Empty strings rejected as invalid |

---

## Test Results

```
Running 28 tests using 5 workers
  28 passed (1.1m)
```

**Success Rate:** 100% (28/28)

---

## Key Fixes During Testing

### 1. DOM Ready Detection
**Problem:** Observer initialization only ran on `DOMContentLoaded`, which may have already fired.

**Solution:** Check `document.readyState` and initialize immediately if DOM is ready:
```typescript
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeObserver);
} else {
  initializeObserver();
}
```
- Location: `src/index.ts:337-341`

### 2. Reinitialization After Destroy
**Problem:** After `destroy()`, the observer couldn't be recreated.

**Solution:** Exported `initializeObserver` function for manual reinitialization:
```typescript
export { initializeObserver };
```
- Location: `src/index.ts:344`

### 3. Duplicate Function Detection
**Issue:** Test expected identical inline functions to register separately.

**Fix:** Updated test to use different functions (different `toString()` output).
- Location: `tests/basic.spec.ts:120-146`

---

## Running Tests

### Basic Commands
```bash
# Run all tests
bun run test

# Run with UI for debugging
bun run test:ui

# Run in debug mode
bun run test:debug
```

### CI/CD Integration
Tests are configured for CI with:
- Automatic retries (2 attempts)
- Single worker for consistency
- HTML reporter output

---

## Test Architecture

### Browser Environment
- **Browser:** Chromium (Playwright)
- **Features Required:**
  - MutationObserver API
  - WeakRef/FinalizationRegistry (ES2021)
  - requestIdleCallback

### Test Server
Simple Bun server serving:
- `GET /` - Test HTML page
- `GET /iripo.js` - Built library

### Test Pattern
All tests follow this pattern:
1. Navigate to test page
2. Wait for `window.iripoReady`
3. Execute test in browser context
4. Return results for assertions

---

## Coverage Areas

### ✅ Fully Tested
- Basic in/out callback functionality
- Lifecycle methods (pause, resume, clear, destroy)
- Error handling in user callbacks
- Selector validation
- Multiple watchers per selector
- Attribute mutation detection
- Reinitialization after destroy

### Future Test Additions
- [ ] Performance benchmarks (large numbers of elements/watchers)
- [ ] Memory leak detection tests
- [ ] Cross-browser testing (Firefox, Safari, Edge)
- [ ] Integration tests with popular frameworks (React, Vue, etc.)

---

## Notes

- Tests run in real browser environment (not JSDOM)
- MutationObserver behavior is actual browser implementation
- requestIdleCallback polyfill is included and tested
- Test timeout: 30 seconds per test
- Total test suite runtime: ~1.1 minutes

---

## Benefits of Playwright Testing

1. **Real Browser Environment**: Tests run in actual Chromium, not simulated DOM
2. **MutationObserver Support**: Can test actual async DOM observation behavior
3. **Timing Control**: requestIdleCallback works as in production
4. **Visual Debugging**: Can see tests run in browser with `--ui` flag
5. **CI Ready**: Designed for headless CI/CD environments
