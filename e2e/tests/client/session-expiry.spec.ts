import { test, expect } from '../../fixtures';

test.describe('session expiry', () => {
  test('clearing auth state forces redirect to login on protected routes', async ({ browser }) => {
    // Use a fresh anonymous context to start from a clean slate — no
    // cookies, no localStorage, no sessionStorage.  Then visiting a
    // protected route must redirect to /login.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/applications');
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    } finally {
      await context.close();
    }
  });
});
