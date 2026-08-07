import { test, expect, request as playwrightRequest } from '@playwright/test';

import { fetchCsrfToken } from '../../helpers/csrf';
import { URLS } from '../../playwright.config';

/**
 * The gateway's @fastify/rate-limit plugin tracks every request and sets
 * the standard X-RateLimit-* headers on the response. In e2e the ceiling
 * is lifted (GATEWAY_AUTH_RATE_LIMIT_MAX) so suites don't trip a 429, but
 * the headers are still emitted — they're the same contract production
 * exposes. We assert on those headers; the login carries the CSRF
 * double-submit header (ADS-919) so it reaches the limiter/auth layer.
 */
test.describe('rate limiting', () => {
  test('login responses carry standard rate-limit headers', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      // Bogus credentials are fine — the request is still counted by the
      // limiter, which is all we're probing for here. The CSRF handshake lets
      // it clear the gate and reach the limiter/auth layer (ADS-919).
      const csrfToken = await fetchCsrfToken(ctx);
      const res = await ctx.post('/api/v1/auth/login', {
        data: { email: 'rate-limit-probe@e2e.test', password: 'whatever' },
        headers: { 'x-csrf-token': csrfToken },
      });

      const headers = res.headers();
      // @fastify/rate-limit emits `x-ratelimit-*`; the draft-spec mode uses
      // the un-prefixed names — accept either so the assertion survives a
      // config change.
      const limit = headers['ratelimit-limit'] ?? headers['x-ratelimit-limit'];
      const remaining = headers['ratelimit-remaining'] ?? headers['x-ratelimit-remaining'];
      expect(limit).toBeTruthy();
      expect(remaining).toBeTruthy();
      // Limit and remaining both parse as numbers.
      expect(Number(limit)).toBeGreaterThan(0);
      expect(Number.isFinite(Number(remaining))).toBe(true);
    } finally {
      await ctx.dispose();
    }
  });
});
