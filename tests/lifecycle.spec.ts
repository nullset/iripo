import { test, expect } from '@playwright/test';

test.describe('Iripo Lifecycle Methods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.iripoReady);
  });

  test('pause() prevents callback from firing', async ({ page }) => {
    const fired = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let hasFired = false;

        const sym = window.iripo.in('.paused-element', () => {
          hasFired = true;
        });

        if (sym) {
          window.iripo.pause(sym);

          const div = document.createElement('div');
          div.className = 'paused-element';
          document.body.appendChild(div);

          setTimeout(() => resolve(hasFired), 100);
        } else {
          resolve(false);
        }
      });
    });

    expect(fired).toBe(false);
  });

  test('resume() allows paused callback to fire', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const sym = window.iripo.in('.resumed-element', (elem) => {
          resolve(elem.textContent || '');
        });

        if (sym) {
          window.iripo.pause(sym);

          const div = document.createElement('div');
          div.className = 'resumed-element';
          div.textContent = 'Resumed';
          document.body.appendChild(div);

          // Resume after element is added
          setTimeout(() => {
            window.iripo.resume(sym);
          }, 50);
        }
      });
    });

    expect(result).toBe('Resumed');
  });

  test('pauseAll() stops all callbacks', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        window.iripo.in('.pause-all-1', () => {
          callCount++;
        });

        window.iripo.in('.pause-all-2', () => {
          callCount++;
        });

        window.iripo.pauseAll();

        const div1 = document.createElement('div');
        div1.className = 'pause-all-1';
        document.body.appendChild(div1);

        const div2 = document.createElement('div');
        div2.className = 'pause-all-2';
        document.body.appendChild(div2);

        setTimeout(() => resolve(callCount), 100);
      });
    });

    expect(count).toBe(0);
  });

  test('resumeAll() resumes all paused callbacks', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        window.iripo.in('.resume-all-1', () => {
          callCount++;
        });

        window.iripo.in('.resume-all-2', () => {
          callCount++;
        });

        window.iripo.pauseAll();

        const div1 = document.createElement('div');
        div1.className = 'resume-all-1';
        document.body.appendChild(div1);

        const div2 = document.createElement('div');
        div2.className = 'resume-all-2';
        document.body.appendChild(div2);

        setTimeout(() => {
          window.iripo.resumeAll();
          setTimeout(() => resolve(callCount), 100);
        }, 50);
      });
    });

    expect(count).toBe(2);
  });

  test('clear() removes watcher', async ({ page }) => {
    const fired = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let hasFired = false;

        const sym = window.iripo.in('.cleared-element', () => {
          hasFired = true;
        });

        if (sym) {
          window.iripo.clear(sym);

          const div = document.createElement('div');
          div.className = 'cleared-element';
          document.body.appendChild(div);

          setTimeout(() => resolve(hasFired), 100);
        } else {
          resolve(false);
        }
      });
    });

    expect(fired).toBe(false);
  });

  test('clear() removes out callback', async ({ page }) => {
    const fired = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let outFired = false;

        const div = document.createElement('div');
        div.className = 'clear-out-element';
        document.body.appendChild(div);

        const inSym = window.iripo.in('.clear-out-element', () => {});
        const outSym = window.iripo.out('.clear-out-element', () => {
          outFired = true;
        });

        if (outSym) {
          window.iripo.clear(outSym);

          setTimeout(() => {
            div.remove();
            setTimeout(() => resolve(outFired), 100);
          }, 50);
        } else {
          resolve(false);
        }
      });
    });

    expect(fired).toBe(false);
  });

  test('destroy() stops all watchers', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        window.iripo.in('.destroy-test-1', () => {
          callCount++;
        });

        window.iripo.in('.destroy-test-2', () => {
          callCount++;
        });

        window.iripo.destroy();

        const div1 = document.createElement('div');
        div1.className = 'destroy-test-1';
        document.body.appendChild(div1);

        const div2 = document.createElement('div');
        div2.className = 'destroy-test-2';
        document.body.appendChild(div2);

        setTimeout(() => resolve(callCount), 100);
      });
    });

    expect(count).toBe(0);
  });

  test('destroy() disconnects MutationObserver', async ({ page }) => {
    const observerActive = await page.evaluate(() => {
      window.iripo.destroy();

      // Check if observer is null
      return window.iripo.observer === null;
    });

    expect(observerActive).toBe(true);
  });

  test('iripo can be reinitialized after destroy', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.iripo.destroy();

      // Reinitialize observer after destroy
      const { initializeObserver } = await import('/iripo.js');
      initializeObserver();

      return new Promise<string>((resolve) => {
        // Re-register after destroy
        window.iripo.in('.reinit-element', (elem) => {
          resolve(elem.textContent || '');
        });

        const div = document.createElement('div');
        div.className = 'reinit-element';
        div.textContent = 'Reinitialized';
        document.body.appendChild(div);
      });
    });

    expect(result).toBe('Reinitialized');
  });
});
