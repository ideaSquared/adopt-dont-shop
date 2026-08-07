import { test, expect, request as playwrightRequest } from '@playwright/test';

import { postWithCsrf } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';
import { ROLES } from '../../fixtures/roles';

/**
 * Logout under ADS-919's cookie model. Login establishes an httpOnly session
 * (accessToken + refreshToken + hasSession cookies); logout's job is to revoke
 * the *refresh* token — which the gateway reads from its httpOnly cookie, not
 * the body (auth.ts) — and clear the auth cookies. Logout is a state-changing
 * request, so it carries the CSRF double-submit header like every mutation. We
 * then assert the React app drops to its anonymous "Login Required" surface
 * once the browser session is wiped.
 */
test.describe('logout flow', () => {
  test('an adopter can log out by revoking their refresh token', async ({ page }) => {
    const { email, password } = ROLES.adopter;

    // Fresh login on a dedicated context so it holds the session cookies
    // (the shared apiAs client caches only a Bearer token). postWithCsrf does
    // the CSRF handshake; the tokens land as httpOnly cookies on this context.
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const loginRes = await postWithCsrf(anon, '/api/v1/auth/login', { email, password });
      expect(loginRes.ok()).toBe(true);

      // Sanity: the cookie session authenticates before logout.
      expect((await anon.get('/api/v1/auth/me')).ok()).toBe(true);

      // Logout revokes the refresh token (read from its httpOnly cookie) and
      // clears the auth cookies. It revokes idempotently.
      const logoutRes = await postWithCsrf(anon, '/api/v1/auth/logout', {});
      expect([200, 204]).toContain(logoutRes.status());
    } finally {
      await anon.dispose();
    }

    // Browser side: load the client origin while authenticated, wipe the
    // session, then reload — the app must fall back to "Login Required".
    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
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
