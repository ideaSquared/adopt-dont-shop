import { test, expect, request as playwrightRequest } from '@playwright/test';

import { fetchCsrfToken } from '../../helpers/csrf';
import { uniqueEmail } from '../../helpers/factories';
import { URLS } from '../../playwright.config';

/**
 * The limiter itself, against a gateway that keeps the PRODUCTION limits.
 *
 * The main e2e gateway lifts every rate limit (GATEWAY_RATE_LIMIT_MAX,
 * GATEWAY_AUTH_RATE_LIMIT_MAX) so a parallel run is not throttled. That would
 * leave the limiter untested, so the isolated stack also starts a second
 * gateway (`service-gateway-limits`, docker-compose.e2e.yml, profile `limits`)
 * with the default limits and its own Redis database, and exposes it through
 * E2E_LIMITER_GATEWAY_URL. Without that variable (the shared dev stack, a plain
 * `pnpm test:e2e`) there is nothing to test against and the spec skips.
 *
 * Login allows 10 requests per minute per IP (services/gateway/src/routes/auth.ts).
 * Every attempt uses a different email so the separate per-email login limiter
 * cannot be what answers 429.
 */
const LOGIN_LIMIT = 10;

test.describe('rate limiting (production limits)', () => {
  test.skip(
    !URLS.limiter,
    'E2E_LIMITER_GATEWAY_URL is not set: needs the isolated stack (pnpm e2e:isolated:full)'
  );
  // The budget is spent within one minute, so a retry would start from an
  // exhausted counter and prove nothing.
  test.describe.configure({ retries: 0 });

  test('login is capped per IP: the 11th attempt in a minute is answered 429', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: URLS.limiter });
    try {
      const csrfToken = await fetchCsrfToken(ctx);
      const attempt = () =>
        ctx.post('/api/v1/auth/login', {
          data: { email: uniqueEmail('rate-limit'), password: 'whatever' },
          headers: { 'x-csrf-token': csrfToken },
        });

      // Bogus credentials: each request is rejected as 401 but still counted.
      const allowed = [];
      for (let i = 0; i < LOGIN_LIMIT; i += 1) {
        allowed.push(await attempt());
      }
      expect(allowed.map(res => res.status())).toEqual(Array(LOGIN_LIMIT).fill(401));

      // The limiter advertises its budget and how much is left.
      const [first] = allowed;
      const last = allowed[LOGIN_LIMIT - 1];
      expect(Number(first?.headers()['x-ratelimit-limit'])).toBe(LOGIN_LIMIT);
      expect(Number(first?.headers()['x-ratelimit-remaining'])).toBe(LOGIN_LIMIT - 1);
      expect(Number(last?.headers()['x-ratelimit-remaining'])).toBe(0);

      const limited = await attempt();
      expect(limited.status()).toBe(429);
      expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    } finally {
      await ctx.dispose();
    }
  });
});
