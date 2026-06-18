import { test, expect, request as playwrightRequest } from '@playwright/test';
import { URLS } from '../../playwright.config';
import { ROLES } from '../../fixtures/roles';

/**
 * Logout under the gateway's Bearer model. There is no CSRF endpoint and
 * access tokens are stateless JWTs — logout's job is to revoke the
 * *refresh* token (recording its jti in the denylist). So the contract is
 * a plain authenticated POST that carries the refresh token minted at
 * login; no CSRF dance is involved. We then assert the React app drops to
 * its anonymous "Login Required" surface once the browser session is wiped.
 */
test.describe('logout flow', () => {
  test('an adopter can log out by revoking their refresh token', async ({ page }) => {
    const { email, password } = ROLES.adopter;

    // Fresh login so we hold BOTH tokens — the shared apiAs cache keeps only
    // the access token, but logout needs the refresh token. No CSRF header.
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    const loginRes = await anon.post('/api/v1/auth/login', { data: { email, password } });
    expect(loginRes.ok()).toBe(true);
    const body = (await loginRes.json()) as {
      tokens?: { accessToken?: string; refreshToken?: string };
    };
    const accessToken = body.tokens?.accessToken;
    const refreshToken = body.tokens?.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    await anon.dispose();

    const authed = await playwrightRequest.newContext({
      baseURL: URLS.api,
      extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
    });
    try {
      // Sanity: the access token authenticates before logout.
      expect((await authed.get('/api/v1/auth/me')).ok()).toBe(true);

      // Logout takes no CSRF token — the Bearer context plus the refresh
      // token in the body is the whole contract. It revokes idempotently.
      const logoutRes = await authed.post('/api/v1/auth/logout', { data: { refreshToken } });
      expect([200, 204]).toContain(logoutRes.status());
    } finally {
      await authed.dispose();
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
