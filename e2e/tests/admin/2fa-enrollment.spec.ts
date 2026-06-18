import { generateSync } from 'otplib';

import { test, expect, request as playwrightRequest } from '@playwright/test';

import { uniqueEmail } from '../../helpers/factories';
import { verifyEmailViaPeek } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

/**
 * 2FA enrolment + login enforcement, exercised on a DEDICATED throwaway
 * account.
 *
 * Why a throwaway: enabling 2FA gates that account's future logins, so we
 * must NOT run it on a shared seeded persona — global-setup and the other
 * admin specs sign those in, and a left-enabled 2FA would break the suite.
 * A freshly-registered user is owned entirely by this test.
 *
 * Contract:
 *   1. setup → { secret }; otplib drives a valid 6-digit code.
 *   2. enable with a current code turns 2FA on.
 *   3. once enabled, a password-only login is answered with
 *      two_factor_required and NO tokens (the enforcement contract).
 *   4. disable with a fresh code turns it back off.
 */
test.describe('2FA enrollment', () => {
  // No shared storageState — this spec mints its own throwaway session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a user can set up, enable and disable TOTP 2FA, and login enforces it', async () => {
    const email = uniqueEmail('twofa');
    const password = 'BehaviourTest123!';

    // Register + log in the throwaway account.
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    const reg = await anon.post('/api/v1/auth/register', {
      data: {
        email,
        password,
        firstName: 'E2E',
        lastName: 'TwoFA',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      },
    });
    expect([200, 201]).toContain(reg.status());

    // Login now requires a verified email, so verify the throwaway account via
    // the token-peek seam before the password login can mint tokens.
    await verifyEmailViaPeek(email);

    const loginRes = await anon.post('/api/v1/auth/login', { data: { email, password } });
    expect(loginRes.ok()).toBe(true);
    const loginBody = (await loginRes.json()) as { tokens?: { accessToken?: string } };
    const accessToken = loginBody.tokens?.accessToken;
    expect(accessToken).toBeTruthy();
    await anon.dispose();

    const api = await playwrightRequest.newContext({
      baseURL: URLS.api,
      extraHTTPHeaders: { Authorization: `Bearer ${accessToken!}` },
    });
    try {
      // 1. Setup mints a secret the client can drive with otplib.
      const setupRes = await api.post('/api/v1/auth/2fa/setup');
      expect(setupRes.ok()).toBe(true);
      const { secret } = (await setupRes.json()) as { secret?: string };
      expect(secret).toBeTruthy();
      expect(generateSync({ secret: secret! })).toMatch(/^\d{6}$/);

      // 2. Enable with a current code turns 2FA on.
      const enableRes = await api.post('/api/v1/auth/2fa/enable', {
        data: { secret, token: generateSync({ secret: secret! }) },
      });
      expect(enableRes.ok()).toBe(true);

      // 3. A password-only login now returns two_factor_required + no tokens.
      const challenge = await playwrightRequest.newContext({ baseURL: URLS.api });
      try {
        const reLogin = await challenge.post('/api/v1/auth/login', { data: { email, password } });
        expect(reLogin.ok()).toBe(true);
        const body = (await reLogin.json()) as { twoFactorRequired?: boolean; tokens?: unknown };
        expect(body.twoFactorRequired).toBe(true);
        expect(body.tokens).toBeFalsy();
      } finally {
        await challenge.dispose();
      }

      // 4. Disable with a fresh code turns it back off.
      const disableRes = await api.post('/api/v1/auth/2fa/disable', {
        data: { token: generateSync({ secret: secret! }) },
      });
      expect(disableRes.ok()).toBe(true);
    } finally {
      await api.dispose();
    }
  });
});
