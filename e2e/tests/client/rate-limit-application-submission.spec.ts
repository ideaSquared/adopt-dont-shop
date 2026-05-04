import { test, expect, request as playwrightRequest } from '@playwright/test';
import { URLS } from '../../playwright.config';

/**
 * In development the rate limiter is configured to log warnings rather
 * than return 429 (so HMR reloads don't get blocked) — but it still
 * tracks the limit and emits standard `X-RateLimit-*` headers.  We
 * assert on those headers, which is the contract the *production*
 * limiter also exposes; if those go missing in dev, they'll go missing
 * in prod too.
 */
test.describe('rate limiting', () => {
  test('login responses include standard rate-limit headers', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const csrfRes = await ctx.get('/api/v1/csrf-token');
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      const res = await ctx.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': csrfToken! },
        data: { email: 'rate-limit-probe@e2e.test', password: 'whatever' },
      });

      const headers = res.headers();
      // express-rate-limit sets these regardless of dev-mode bypass.
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
