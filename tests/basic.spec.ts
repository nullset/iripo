import { test, expect } from '@playwright/test';

test.describe('Iripo Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.iripoReady);
  });

  test('in() callback fires when element appears', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        window.iripo.in('.test-element', (elem) => {
          resolve(elem.textContent || '');
        });

        // Add element after registering watcher
        const div = document.createElement('div');
        div.className = 'test-element';
        div.textContent = 'Hello';
        document.body.appendChild(div);
      });
    });

    expect(result).toBe('Hello');
  });

  test('in() callback fires for existing elements when processNow is true', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Add element first
      const div = document.createElement('div');
      div.className = 'existing-element';
      div.textContent = 'Existing';
      document.body.appendChild(div);

      return new Promise<string>((resolve) => {
        // Register watcher with processNow=true
        window.iripo.in('.existing-element', (elem) => {
          resolve(elem.textContent || '');
        }, true);
      });
    });

    expect(result).toBe('Existing');
  });

  test('in() callback does not fire twice for same element', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        window.iripo.in('.unique-element', () => {
          callCount++;
        });

        const div = document.createElement('div');
        div.className = 'unique-element';
        document.body.appendChild(div);

        // Wait a bit to ensure callback doesn't fire multiple times
        setTimeout(() => resolve(callCount), 100);
      });
    });

    expect(count).toBe(1);
  });

  test('out() callback fires when element is removed', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const div = document.createElement('div');
        div.className = 'removable-element';
        div.textContent = 'Will be removed';

        window.iripo.in('.removable-element', () => {
          // Element added
        });

        window.iripo.out('.removable-element', (elem) => {
          resolve(elem.textContent || '');
        });

        document.body.appendChild(div);

        // Remove element after a short delay
        setTimeout(() => {
          div.remove();
        }, 50);
      });
    });

    expect(result).toBe('Will be removed');
  });

  test('out() callback fires when element no longer matches selector', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const div = document.createElement('div');
        div.className = 'changeable active';

        window.iripo.in('.changeable.active', () => {
          // Element matches
        });

        window.iripo.out('.changeable.active', () => {
          resolve(true);
        });

        document.body.appendChild(div);

        // Change class so it no longer matches
        setTimeout(() => {
          div.classList.remove('active');
        }, 50);
      });
    });

    expect(result).toBe(true);
  });

  test('multiple watchers can be registered for same selector', async ({ page }) => {
    const count = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let callCount = 0;

        // Use different functions (not identical inline functions)
        const callback1 = () => {
          callCount++;
        };

        const callback2 = () => {
          callCount += 10; // Different code
        };

        window.iripo.in('.multi-watch', callback1);
        window.iripo.in('.multi-watch', callback2);

        const div = document.createElement('div');
        div.className = 'multi-watch';
        document.body.appendChild(div);

        setTimeout(() => resolve(callCount), 100);
      });
    });

    expect(count).toBe(11); // 1 + 10
  });

  test('in() returns symbol that can be used with other methods', async ({ page }) => {
    const hasSymbol = await page.evaluate(() => {
      const sym = window.iripo.in('.symbol-test', () => {});
      return typeof sym === 'symbol';
    });

    expect(hasSymbol).toBe(true);
  });

  test('in() returns null for invalid selector', async ({ page }) => {
    const result = await page.evaluate(() => {
      return window.iripo.in(':::invalid:::', () => {});
    });

    expect(result).toBeNull();
  });

  test('out() returns null for invalid selector', async ({ page }) => {
    const result = await page.evaluate(() => {
      return window.iripo.out(':::invalid:::', () => {});
    });

    expect(result).toBeNull();
  });
});
