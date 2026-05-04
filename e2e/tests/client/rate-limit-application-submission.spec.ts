import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';

/**
 * The backend bypasses rate limiting in NODE_ENV=development to keep HMR
 * fast; the e2e stack runs in development.  Skip the assertion in that
 * mode and only enforce the 429 contract when the limiter is actually
 * active (production / staging stacks).
 */
test.describe('rate limiting', () => {
  test('login burst eventually triggers 429 (when rate limiter is active)', async ({ apiAs }) => {
    const api = await apiAs('adopter');

    // Probe the runtime mode through the health endpoint — payload includes
    // a "environment" or similar marker on most deployments.  If we can't
    // tell, fall back to detecting 429 with a generous attempt budget.
    const healthRes = await api.context.get(`${URLS.api}/health`);
    let limiterActive = true;
    if (healthRes.ok()) {
      try {
        const healthBody = (await healthRes.json()) as { environment?: string; nodeEnv?: string };
        const env = healthBody.environment ?? healthBody.nodeEnv ?? '';
        if (env === 'development' || env === 'test') {
          limiterActive = false;
        }
      } catch {
        // ignore parse errors
      }
    }
    if (!limiterActive) {
      test.skip(true, 'rate limiting is bypassed in development mode');
    }

    let saw429 = false;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await api.context.post('/api/v1/auth/login', {
        data: { email: 'john.smith@gmail.com', password: 'wrong-password-on-purpose' },
      });
      if (response.status() === 429) {
        saw429 = true;
        const retryAfter = response.headers()['retry-after'];
        expect(typeof retryAfter === 'string' || retryAfter === undefined).toBe(true);
        break;
      }
    }

    expect(saw429).toBe(true);
  });
});
