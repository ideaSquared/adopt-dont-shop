import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';

/**
 * ADS-919 acceptance criteria (deferred full-stack spec, shipped in
 * #1215 + #1218). Once a browser holds the httpOnly `accessToken` session
 * cookie, every state-changing request must also carry a valid
 * `x-csrf-token` header that matches the non-HttpOnly `csrfToken`
 * double-submit cookie (services/gateway/src/middleware/csrf.ts) — the
 * session cookie riding along automatically (SameSite=Lax + same-site
 * requests) is NOT sufficient on its own, otherwise a cross-site
 * form/fetch could ride the logged-in user's session. See
 * services/gateway/src/routes/csrf.ts for the token-issuing route and
 * packages/lib.api/src/services/api-service.ts for the client-side half
 * that fetches + attaches the header automatically on every mutating call.
 *
 * Logout is used as the representative authenticated mutation: it's a real
 * POST the SPA issues (AuthService.logout()), is naturally a one-shot
 * action (no cleanup / no risk of colliding with another spec's seeded
 * fixtures), and each test gets its own fresh browser context so logging
 * out here doesn't affect any other test's session.
 */
test.describe('CSRF double-submit enforcement (ADS-919)', () => {
  test('an authenticated mutation is rejected without a valid CSRF token, and succeeds with one @smoke', async ({
    page,
  }) => {
    const logoutUrl = `${URLS.api}/api/v1/auth/logout`;

    // `page.request` shares this browsing context's cookie jar, so the
    // httpOnly accessToken cookie from the project's authenticated
    // storageState rides along automatically on every call below — exactly
    // how the SPA's own fetches behave (`credentials: 'include'`).

    // 1. No x-csrf-token header at all -> rejected before the route even
    // runs (middleware/csrf.ts's onRequest hook). The session cookie alone
    // is not sufficient.
    const missingHeaderRes = await page.request.post(logoutUrl);
    expect(missingHeaderRes.status()).toBe(403);

    // 2. A header present but not matching the csrfToken cookie -> also
    // rejected.
    const mismatchedRes = await page.request.post(logoutUrl, {
      headers: { 'x-csrf-token': 'not-the-real-token' },
    });
    expect(mismatchedRes.status()).toBe(403);

    // Neither rejected attempt logged the user out — the session must
    // still be alive before we prove the valid-token path below.
    const meRes = await page.request.get(`${URLS.api}/api/v1/auth/me`);
    expect(meRes.ok()).toBe(true);

    // 3. Fetch the real double-submit token the way the SPA's request
    // interceptor does (GET /api/v1/csrf-token sets the csrfToken cookie
    // and returns the same value in the body), then retry with a matching
    // x-csrf-token header.
    const csrfRes = await page.request.get(`${URLS.api}/api/v1/csrf-token`);
    expect(csrfRes.ok()).toBe(true);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    expect(csrfToken).toBeTruthy();

    const validRes = await page.request.post(logoutUrl, {
      headers: { 'x-csrf-token': csrfToken },
    });
    expect(validRes.ok()).toBe(true);
  });
});
