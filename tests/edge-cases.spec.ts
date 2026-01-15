import { test, expect } from '@playwright/test';

test.describe('Iripo Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.iripoReady);
  });

  test('callback error does not stop other callbacks', async ({ page }) => {
    const { success, errorLogged } = await page.evaluate(() => {
      return new Promise<{ success: boolean; errorLogged: boolean }>((resolve) => {
        let successCallbackFired = false;
        let errorWasLogged = false;

        // Capture console.error
        const originalError = console.error;
        console.error = (...args: any[]) => {
          if (args[0]?.includes("Error in iripo 'in' callback")) {
            errorWasLogged = true;
          }
          originalError.apply(console, args);
        };

        // Register callback that throws
        window.iripo.in('.error-element', () => {
          throw new Error('Test error');
        });

        // Register callback that should still work
        window.iripo.in('.error-element', () => {
          successCallbackFired = true;
        });

        const div = document.createElement('div');
        div.className = 'error-element';
        document.body.appendChild(div);

        setTimeout(() => {
          console.error = originalError;
          resolve({
            success: successCallbackFired,
            errorLogged: errorWasLogged,
          });
        }, 100);
      });
    });

    expect(success).toBe(true);
    expect(errorLogged).toBe(true);
  });

  test('out callback error does not stop other out callbacks', async ({ page }) => {
    const { success, errorLogged } = await page.evaluate(() => {
      return new Promise<{ success: boolean; errorLogged: boolean }>((resolve) => {
        let successCallbackFired = false;
        let errorWasLogged = false;

        const originalError = console.error;
        console.error = (...args: any[]) => {
          if (args[0]?.includes("Error in iripo 'out' callback")) {
            errorWasLogged = true;
          }
          originalError.apply(console, args);
        };

        const div = document.createElement('div');
        div.className = 'out-error-element';

        window.iripo.in('.out-error-element', () => {});

        window.iripo.out('.out-error-element', () => {
          throw new Error('Out error');
        });

        window.iripo.out('.out-error-element', () => {
          successCallbackFired = true;
        });

        document.body.appendChild(div);

        setTimeout(() => {
          div.remove();
          setTimeout(() => {
            console.error = originalError;
            resolve({
              success: successCallbackFired,
              errorLogged: errorWasLogged,
            });
          }, 100);
        }, 50);
      });
    });

    expect(success).toBe(true);
    expect(errorLogged).toBe(true);
  });

  test('complex selector matching works', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        window.iripo.in('div.container > .item[data-type="test"]', (elem) => {
          resolve(elem.getAttribute('data-type') || '');
        });

        const container = document.createElement('div');
        container.className = 'container';

        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('data-type', 'test');

        container.appendChild(item);
        document.body.appendChild(container);
      });
    });

    expect(result).toBe('test');
  });

  test('same function registered twice creates separate watchers', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        const callback = () => {
          callCount++;
        };

        // Register same function twice for same selector
        window.iripo.in('.duplicate-fn', callback);
        window.iripo.in('.duplicate-fn', callback);

        const div = document.createElement('div');
        div.className = 'duplicate-fn';
        document.body.appendChild(div);

        setTimeout(() => resolve(callCount), 100);
      });
    });

    // Should only fire once because getSymbol checks both selector AND function
    expect(count).toBe(1);
  });

  test('rapidly adding and removing elements works correctly', async ({ page }) => {
    const counts = await page.evaluate(() => {
      return new Promise<{ inCount: number; outCount: number }>((resolve) => {
        let inCount = 0;
        let outCount = 0;

        window.iripo.in('.rapid-element', () => {
          inCount++;
        });

        window.iripo.out('.rapid-element', () => {
          outCount++;
        });

        // Rapidly add and remove 10 elements
        for (let i = 0; i < 10; i++) {
          const div = document.createElement('div');
          div.className = 'rapid-element';
          document.body.appendChild(div);

          setTimeout(() => {
            div.remove();
          }, i * 10 + 50);
        }

        setTimeout(() => {
          resolve({ inCount, outCount });
        }, 500);
      });
    });

    expect(counts.inCount).toBe(10);
    expect(counts.outCount).toBe(10);
  });

  test('nested element mutations trigger watchers', async ({ page }) => {
    const fired = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let hasFired = false;

        window.iripo.in('.nested-child', () => {
          hasFired = true;
        });

        const parent = document.createElement('div');
        const child = document.createElement('div');
        child.className = 'nested-child';

        parent.appendChild(child);
        document.body.appendChild(parent);

        setTimeout(() => resolve(hasFired), 100);
      });
    });

    expect(fired).toBe(true);
  });

  test('attribute changes are detected when selector depends on attributes', async ({ page }) => {
    const results = await page.evaluate(() => {
      return new Promise<{ inFired: boolean; outFired: boolean }>((resolve) => {
        let inFired = false;
        let outFired = false;

        const div = document.createElement('div');
        div.className = 'attr-test';
        document.body.appendChild(div);

        window.iripo.in('.attr-test[data-active="true"]', () => {
          inFired = true;
        });

        window.iripo.out('.attr-test[data-active="true"]', () => {
          outFired = true;
        });

        // Add attribute to match selector
        setTimeout(() => {
          div.setAttribute('data-active', 'true');

          // Remove attribute to trigger out callback
          setTimeout(() => {
            div.removeAttribute('data-active');

            setTimeout(() => {
              resolve({ inFired, outFired });
            }, 100);
          }, 100);
        }, 50);
      });
    });

    expect(results.inFired).toBe(true);
    expect(results.outFired).toBe(true);
  });

  test('clearing a symbol multiple times does not cause errors', async ({ page }) => {
    const noError = await page.evaluate(() => {
      const sym = window.iripo.in('.multi-clear', () => {});

      if (sym) {
        try {
          window.iripo.clear(sym);
          window.iripo.clear(sym);
          window.iripo.clear(sym);
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    expect(noError).toBe(true);
  });

  test('pausing and resuming the same symbol multiple times works', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const sym = window.iripo.in('.multi-pause', () => {
          resolve(true);
        });

        if (sym) {
          window.iripo.pause(sym);
          window.iripo.pause(sym); // Pause again
          window.iripo.resume(sym, false);
          window.iripo.resume(sym); // Resume again with processNow

          const div = document.createElement('div');
          div.className = 'multi-pause';
          document.body.appendChild(div);
        }
      });
    });

    expect(result).toBe(true);
  });

  test('empty selector string returns null', async ({ page }) => {
    const result = await page.evaluate(() => {
      return window.iripo.in('', () => {});
    });

    expect(result).toBeNull();
  });
});
