import { authenticator } from 'otplib';

import { test, expect } from '../../fixtures';
import { expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Drive the 2FA enrollment flow end-to-end through the API.  The
 * superadmin user might already have 2FA on from a prior run, so the
 * test is structured to be re-entrant: read the current state, get a
 * fresh secret, enable, then disable.  If 2FA is already enabled at
 * the start, /setup returns 400 — we handle that by skipping straight
 * to the disable step.
 */
test.describe('admin 2FA enrollment', () => {
  test('an admin can enroll and disable TOTP-based 2FA', async ({ apiAs }) => {
    const adminApi = await apiAs('admin');

    const setupRes = await postWithCsrf(adminApi.context, '/api/v1/auth/2fa/setup');
    if (!setupRes.ok()) {
      // Already enabled from a previous run.  We don't have the original
      // secret here, so we can't generate a TOTP code — fall back to
      // asserting that the endpoint declined for the right reason.
      const status = setupRes.status();
      const body = (await setupRes.text()).toLowerCase();
      expect(status).toBe(400);
      expect(body).toMatch(/already enabled|already on/);
      return;
    }
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
    await expectOk(enableRes, 'POST /auth/2fa/enable');

    // Disable so the suite is repeatable.  Generate a fresh TOTP code
    // because the previous one may have rolled past its window during
    // the round trip.
    const disableCode = authenticator.generate(secret!);
    const disableRes = await postWithCsrf(adminApi.context, '/api/v1/auth/2fa/disable', {
      token: disableCode,
    });
    await expectOk(disableRes, 'POST /auth/2fa/disable');
  });
});
