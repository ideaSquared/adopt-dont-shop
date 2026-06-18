import { test, expect, request as playwrightRequest } from '@playwright/test';
import { URLS } from '../../playwright.config';

/**
 * Codify the gateway's auth contract. The Fastify gateway replaced the
 * deleted monolith's CSRF + httpOnly-cookie model with stateless Bearer
 * tokens, so the invariants the e2e infra relies on are the inverse of the
 * old ones:
 *
 *   1. State-changing requests need NO CSRF token — they're judged on the
 *      Authorization header (or credentials), never rejected for a missing
 *      CSRF token. A bad-credentials login is auth-shaped (401), not a 403.
 *   2. The legacy GET /csrf-token endpoint no longer exists (404).
 *   3. A protected read without a Bearer token is rejected with 401.
 */
test.describe('gateway auth contract (Bearer, no CSRF)', () => {
  test('an unauthenticated POST needs no CSRF token — it reaches the auth layer', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email: 'definitely-not-real@e2e.test', password: 'definitely-not-real' },
      });
      // No CSRF gate: the request is judged on its credentials, not on a
      // missing CSRF token. Bogus creds → auth-shaped failure, never 403.
      expect(res.status()).not.toBe(403);
      expect([400, 401]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test('the legacy /csrf-token endpoint no longer exists', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/api/v1/csrf-token');
      expect(res.status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  });

  test('a protected read without a Bearer token is rejected with 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const res = await ctx.get('/api/v1/auth/me');
      expect(res.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });
});
