import { test, expect } from '../../fixtures';

/**
 * Verify that logout actually invalidates the session.  The dev_user
 * shortcut in AuthContext means a stale localStorage entry can mask a
 * real auth failure — this test deliberately drives the API logout
 * endpoint AND clears local storage, then asserts that a follow-up
 * request to a protected resource fails with 401.
 *
 * Why API instead of UI: the per-app logout button lives in different
 * places (sidebar, user menu, mobile drawer) and is liable to move.
 * The contract we care about is "logout invalidates the cookies",
 * which the API exercises directly.
 */
test.describe('logout flow', () => {
  test('an adopter can log out and is then unauthenticated', async ({ page, apiAs }) => {
    const api = await apiAs('adopter');

    // Sanity: confirm the cookies authenticate before logout.
    const beforeRes = await api.context.get('/api/v1/auth/me');
    expect(beforeRes.ok()).toBe(true);

    // Logout via API.
    const csrfRes = await api.context.get('/api/v1/csrf-token');
    expect(csrfRes.ok()).toBe(true);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
    expect(csrfToken).toBeTruthy();

    const logoutRes = await api.context.post('/api/v1/auth/logout', {
      headers: { 'x-csrf-token': csrfToken! },
    });
    expect([200, 204]).toContain(logoutRes.status());

    // After logout, the same context's cookies must no longer authenticate.
    const afterRes = await api.context.get('/api/v1/auth/me');
    expect(afterRes.status()).toBe(401);

    // And the React app, if we wipe the dev_user shortcut and reload,
    // should treat the user as anonymous on a protected surface.
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // ignore
      }
    });
    await page.context().clearCookies();
    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const loginPrompt = page
      .getByRole('heading', { name: /login required/i })
      .or(page.getByText(/login required/i))
      .or(page.getByRole('link', { name: /sign in/i }))
      .first();
    await expect(loginPrompt).toBeVisible({ timeout: 20_000 });
  });
});
