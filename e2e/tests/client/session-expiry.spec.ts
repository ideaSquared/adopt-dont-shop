import { test, expect } from '../../fixtures';

test.describe('session expiry', () => {
  test('an anonymous user does not see the favorites list', async ({ browser }) => {
    // The client app doesn't hard-redirect anonymous users on protected
    // routes — instead each page renders its own login prompt.  /favorites
    // is the cleanest example: it shows a "Login Required" panel when
    // the user has no session.  We assert on that surface (the boundary
    // the user actually sees) rather than on a /login URL that never
    // arrives.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });

      const loginPrompt = page
        .getByRole('heading', { name: /login required/i })
        .or(page.getByText(/login required/i))
        .or(page.getByRole('link', { name: /sign in/i }))
        .first();
      await expect(loginPrompt).toBeVisible({ timeout: 20_000 });
    } finally {
      await context.close();
    }
  });
});
