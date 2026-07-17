import { test, expect } from '../../fixtures';
import { loginViaUI } from '../../helpers/auth';
import { ROLES } from '../../fixtures/roles';

/**
 * ADS-919 acceptance criteria (deferred full-stack spec, shipped in
 * #1218 + #1215). The gateway now sets the access/refresh token pair as
 * HttpOnly cookies on login (services/gateway/src/middleware/auth-cookies.ts)
 * instead of returning them in the JSON body or letting the SPA persist them
 * to localStorage (the pre-cookie AuthService's `__dev_*` keys were removed
 * in #1219). Only a non-HttpOnly `hasSession` presence marker is
 * JS-readable — see packages/lib.auth/src/services/session-cookie.ts.
 *
 * This spec proves the token pair is genuinely unreachable from in-page
 * JavaScript — the exact threat model an XSS payload would exploit — and
 * that the session still survives a full page reload despite that.
 */
test.describe('httpOnly cookie auth — token exfiltration guard (ADS-919)', () => {
  // Start from a clean, unauthenticated context so every assertion below
  // follows directly from a real login performed inside this test, not from
  // the pre-authenticated storageState the rest of the client project uses.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an injected page script cannot recover the access/refresh tokens after login, and a reload keeps the session @smoke', async ({
    page,
  }) => {
    const { email, password } = ROLES.adopter;
    await loginViaUI(page, email, password);

    // --- 1. The cookies exist and are flagged HttpOnly -------------------
    // Playwright's BrowserContext.cookies() reads the cookie jar out of
    // band (via CDP) — the same channel any automation/devtools tooling
    // uses, NOT a page script. Asserting the flag directly (rather than
    // only inferring it from document.cookie below) means a regression
    // that drops HttpOnly fails loudly even if this particular page
    // happens not to read it back.
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken');
    const sessionMarkerCookie = cookies.find(c => c.name === 'hasSession');

    expect(accessTokenCookie, 'accessToken cookie must be set after login').toBeTruthy();
    expect(refreshTokenCookie, 'refreshToken cookie must be set after login').toBeTruthy();
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(refreshTokenCookie?.httpOnly).toBe(true);

    // The session marker is DELIBERATELY JS-readable (it carries no secret)
    // so the SPA can answer "am I logged in" synchronously — assert it
    // exists and is NOT HttpOnly, the inverse of the two real tokens.
    expect(sessionMarkerCookie, 'hasSession marker cookie must be set after login').toBeTruthy();
    expect(sessionMarkerCookie?.httpOnly).toBe(false);

    // --- 2. Simulate an injected reader running inside the page ----------
    // This is the actual attack an XSS payload would run: read everything
    // JS has access to and try to find the tokens.
    const pageVisible = await page.evaluate(() => ({
      cookie: document.cookie,
      localStorage: JSON.stringify(window.localStorage),
      sessionStorage: JSON.stringify(window.sessionStorage),
    }));

    expect(pageVisible.cookie).not.toContain('accessToken=');
    expect(pageVisible.cookie).not.toContain('refreshToken=');

    // The strongest form of the assertion: the real token VALUES must not
    // be recoverable anywhere JS can read, not just absent under their
    // expected cookie/key names (a leak under a renamed key would still
    // show up here).
    expect(pageVisible.cookie).not.toContain(accessTokenCookie!.value);
    expect(pageVisible.cookie).not.toContain(refreshTokenCookie!.value);
    expect(pageVisible.localStorage).not.toContain(accessTokenCookie!.value);
    expect(pageVisible.localStorage).not.toContain(refreshTokenCookie!.value);
    expect(pageVisible.sessionStorage).not.toContain(accessTokenCookie!.value);
    expect(pageVisible.sessionStorage).not.toContain(refreshTokenCookie!.value);

    // ADS-919 cleanup (#1219): the pre-cookie AuthService's plaintext
    // localStorage keys are gone entirely, not just emptied.
    expect(pageVisible.localStorage).not.toMatch(/__dev_(auth|access|refresh)Token/);

    // --- 3. A reload keeps the session with no JS-visible token ----------
    // The session is carried purely by the HttpOnly cookies attached
    // automatically on navigation — there is no token round-trip through
    // JS-visible storage to "restore" on boot.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.goto('/profile', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
      timeout: 15_000,
    });

    const cookieAfterReload = await page.evaluate(() => document.cookie);
    expect(cookieAfterReload).not.toContain('accessToken=');
    expect(cookieAfterReload).not.toContain('refreshToken=');
  });
});
