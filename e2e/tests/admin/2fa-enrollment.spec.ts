import { authenticator } from 'otplib';

import { test, expect } from '../../fixtures';
import { postWithCsrf } from '../../helpers/seeds';

/**
 * Drive the 2FA enrollment flow end-to-end through the API:
 *   1. POST /2fa/setup  → backend returns a TOTP secret.
 *   2. Generate a code from the secret with otplib.
 *   3. POST /2fa/enable with the code → 2FA is now active.
 *   4. POST /2fa/disable with a fresh code → 2FA is off (so subsequent
 *      runs can re-enroll the same admin without state leak).
 */
test.describe('admin 2FA enrollment', () => {
  test('an admin can enroll and disable TOTP-based 2FA', async ({ apiAs }) => {
    const adminApi = await apiAs('admin');

    const setupRes = await postWithCsrf(adminApi.context, '/api/v1/auth/2fa/setup');
    expect(setupRes.ok()).toBe(true);
    const setupBody = (await setupRes.json()) as {
      secret?: string;
      data?: { secret?: string };
    };
    const secret = setupBody.secret ?? setupBody.data?.secret;
    expect(secret).toBeTruthy();

    const enableCode = authenticator.generate(secret!);
    const enableRes = await postWithCsrf(adminApi.context, '/api/v1/auth/2fa/enable', {
      secret,
      token: enableCode,
    });
    expect(enableRes.ok()).toBe(true);

    // Disable so the suite is repeatable — the disable endpoint takes
    // a fresh TOTP code (the previous code may have rolled).
    const disableCode = authenticator.generate(secret!);
    const disableRes = await postWithCsrf(adminApi.context, '/api/v1/auth/2fa/disable', {
      token: disableCode,
    });
    expect(disableRes.ok()).toBe(true);
  });
});
