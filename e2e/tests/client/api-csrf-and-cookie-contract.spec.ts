import { test, expect, request as playwrightRequest } from '@playwright/test';
import { URLS } from '../../playwright.config';

/**
 * Codify the CSRF + cookie contract that the e2e infra repeatedly trips
 * over.  Three invariants:
 *
 *   1. A state-changing request without a CSRF token is rejected (403),
 *      regardless of whether the user is authenticated.
 *   2. Fetching /csrf-token sets a paired cookie + body token.
 *   3. A state-changing request with a matching x-csrf-token header is
 *      accepted at the CSRF layer (the request may then fail for other
 *      reasons — bad credentials, validation — but NOT 403 CSRF).
 */
test.describe('CSRF + cookie contract', () => {
  test('an unauthenticated POST without CSRF is rejected with 403', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email: 'whoever@example.com', password: 'whatever' },
      });
      expect(res.status()).toBe(403);
      const body = await res.text();
      expect(body.toLowerCase()).toContain('csrf');
    } finally {
      await ctx.dispose();
    }
  });

  test('the /csrf-token endpoint returns a token in the body', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/api/v1/csrf-token');
      expect(res.ok()).toBe(true);
      const { csrfToken } = (await res.json()) as { csrfToken?: string };
      expect(csrfToken).toBeTruthy();
      expect(typeof csrfToken).toBe('string');
      expect(csrfToken!.length).toBeGreaterThan(0);
    } finally {
      await ctx.dispose();
    }
  });

  test('a POST with a fresh CSRF token clears the CSRF gate', async () => {
    // The request still fails — the credentials are bogus — but the
    // failure must be auth-shaped (400/401), NOT a 403 CSRF rejection.
    // That distinction is the whole contract.
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const csrfRes = await ctx.get('/api/v1/csrf-token');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      expect(csrfToken).toBeTruthy();

      const res = await ctx.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': csrfToken! },
        data: { email: 'definitely-not-real@e2e.test', password: 'definitely-not-real' },
      });
      expect(res.status()).not.toBe(403);
      // Reasonable shapes for "bad credentials" vs "validation failure".
      expect([400, 401]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});
