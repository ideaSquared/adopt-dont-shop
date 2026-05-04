import { test, expect } from '../../fixtures';

test.describe('session expiry', () => {
  test('clearing auth state forces redirect to login on protected routes', async ({
    page,
    context,
  }) => {
    await page.goto('/profile');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    // Forcefully invalidate session by clearing all storage. Mirrors what
    // happens when a token expires server-side and the next call 401s.
    await context.clearCookies();
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // some browsers throw on access in odd states; ignore
      }
    });

    // A protected route after clearing storage must end up at /login —
    // either via a guard or after a 401 from the API.  Allow more time for
    // the round-trip / redirect chain.
    await page.goto('/applications');
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});
