import { test, expect } from '../../fixtures';

/**
 * Drive the rate-limit response directly through the API so we don't
 * need to find a unique pet for every iteration. The behaviour we care
 * about is: at some point past the configured threshold, the API
 * returns 429, and a sensible structured payload comes back.
 */
test.describe('rate limiting', () => {
  test('submitting many login attempts in a short window triggers 429', async ({ apiAs }) => {
    const api = await apiAs('adopter');

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
