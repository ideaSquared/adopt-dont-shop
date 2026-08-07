import { test, expect, request as playwrightRequest } from '@playwright/test';

import { fetchCsrfToken } from '../../helpers/csrf';
import { URLS } from '../../playwright.config';

/**
 * Codify the gateway's auth contract under ADS-919 (httpOnly cookies + CSRF
 * double-submit). The invariants the e2e infra relies on:
 *
 *   1. GET /api/v1/csrf-token issues a double-submit token (200 + body value).
 *   2. A state-changing request that carries the csrfToken cookie is rejected
 *      (403) without a matching x-csrf-token header, and reaches the auth layer
 *      once the header matches (bad creds → 400/401, never 403).
 *   3. A protected read without credentials is rejected with 401.
 */
test.describe('gateway auth contract (cookies + CSRF, ADS-919)', () => {
  test('GET /api/v1/csrf-token issues a double-submit token', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/api/v1/csrf-token');
      expect(res.status()).toBe(200);
      const body = (await res.json()) as { csrfToken?: string };
      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken?.length ?? 0).toBeGreaterThan(0);
    } finally {
      await ctx.dispose();
    }
  });

  test('the CSRF gate blocks a mismatched mutation and clears a matching one', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      // fetchCsrfToken sets the csrfToken cookie on this context, so the gate
      // now enforces the double-submit on state-changing requests.
      const csrfToken = await fetchCsrfToken(ctx);

      // Cookie present, header missing → rejected before the auth layer.
      const noHeader = await ctx.post('/api/v1/auth/login', {
        data: { email: 'definitely-not-real@e2e.test', password: 'definitely-not-real' },
      });
      expect(noHeader.status()).toBe(403);

      // Matching header → the request is judged on its credentials, not CSRF.
      // Bogus creds → auth-shaped failure, never 403.
      const withHeader = await ctx.post('/api/v1/auth/login', {
        data: { email: 'definitely-not-real@e2e.test', password: 'definitely-not-real' },
        headers: { 'x-csrf-token': csrfToken },
      });
      expect(withHeader.status()).not.toBe(403);
      expect([400, 401]).toContain(withHeader.status());
    } finally {
      await ctx.dispose();
    }
  });

  test('a protected read without credentials is rejected with 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/api/v1/auth/me');
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});
