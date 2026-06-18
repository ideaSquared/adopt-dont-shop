import { test, expect, request as playwrightRequest } from '@playwright/test';

import { uniqueEmail } from '../../helpers/factories';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

// ADS-871: the FULL password-reset round-trip, end to end through the gateway.
// Today's password-reset-flow.spec only asserts the request confirmation + a
// bad-token rejection — it can't read the emailed reset token. This drives the
// whole journey on a throwaway account:
//   register → verify (so the account is active + loginable)
//   → forgot-password → READ the reset token via the test-token-peek seam
//   → reset-password with a new password → log in with the NEW password
//   → confirm the OLD password no longer works.
// Throwaway account only — never mutates a shared seeded persona's auth state.

const OLD_PASSWORD = 'OldBehaviour123!';
const NEW_PASSWORD = 'NewBehaviour456!';

test.describe('password reset round-trip (ADS-871)', () => {
  test('a user can reset their password via the emailed token and log in with it', async () => {
    const email = uniqueEmail('pwreset');
    const api = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      // 1. Register a throwaway adopter.
      const registerRes = await api.post('/api/v1/auth/register', {
        data: {
          email,
          password: OLD_PASSWORD,
          firstName: 'Reset',
          lastName: 'Roundtrip',
          termsAccepted: true,
          privacyPolicyAccepted: true,
        },
      });
      expect([200, 201]).toContain(registerRes.status());

      // 2. Verify the email so the account is active (registration is
      // verification-first: status stays pending_verification until verified).
      const afterRegister = await peekAuthTokens(email);
      expect(afterRegister.verificationToken).toBeTruthy();
      const verifyRes = await api.post('/api/v1/auth/verify-email', {
        data: { verificationToken: afterRegister.verificationToken },
      });
      expect(verifyRes.ok()).toBe(true);

      // 3. Request a password reset.
      const forgotRes = await api.post('/api/v1/auth/forgot-password', { data: { email } });
      expect(forgotRes.ok()).toBe(true);

      // 4. Read the reset token via the test-token-peek seam.
      const afterForgot = await peekAuthTokens(email);
      expect(afterForgot.resetToken).toBeTruthy();

      // 5. Reset the password using the token.
      const resetRes = await api.post('/api/v1/auth/reset-password', {
        data: { resetToken: afterForgot.resetToken, newPassword: NEW_PASSWORD },
      });
      expect(resetRes.ok()).toBe(true);

      // 6. Logging in with the NEW password succeeds.
      const newLogin = await api.post('/api/v1/auth/login', {
        data: { email, password: NEW_PASSWORD },
      });
      expect(newLogin.ok()).toBe(true);
      const body = (await newLogin.json()) as { tokens?: { accessToken?: string } };
      expect(body.tokens?.accessToken).toBeTruthy();

      // 7. The OLD password is now rejected.
      const oldLogin = await api.post('/api/v1/auth/login', {
        data: { email, password: OLD_PASSWORD },
      });
      expect(oldLogin.ok()).toBe(false);
      expect([400, 401]).toContain(oldLogin.status());
    } finally {
      await api.dispose();
    }
  });
});
