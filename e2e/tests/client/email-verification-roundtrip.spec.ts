import { test, expect, request as playwrightRequest } from '@playwright/test';

import { uniqueEmail } from '../../helpers/factories';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

// ADS-871: the FULL email-verification round-trip. Registration is
// verification-first — a fresh account is `pending_verification` and login is
// rejected until the email is verified. Today's email-verification-gating spec
// only checks that an ALREADY-verified seeded adopter isn't blocked; it can't
// read the emailed token. This drives the real journey on a throwaway account:
//   register → login is rejected (unverified)
//   → READ the verification token via the test-token-peek seam → verify
//   → login now succeeds.

const PASSWORD = 'VerifyBehaviour123!';

test.describe('email verification round-trip (ADS-871)', () => {
  test('a freshly registered user must verify before they can log in', async () => {
    const email = uniqueEmail('verify');
    const api = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      // 1. Register a throwaway adopter.
      const registerRes = await api.post('/api/v1/auth/register', {
        data: {
          email,
          password: PASSWORD,
          firstName: 'Verify',
          lastName: 'Roundtrip',
          termsAccepted: true,
          privacyPolicyAccepted: true,
        },
      });
      expect([200, 201]).toContain(registerRes.status());

      // 2. Login is rejected while the account is unverified.
      const unverifiedLogin = await api.post('/api/v1/auth/login', {
        data: { email, password: PASSWORD },
      });
      expect(unverifiedLogin.ok()).toBe(false);

      // 3. Read the verification token via the test-token-peek seam.
      const tokens = await peekAuthTokens(email);
      expect(tokens.verificationToken).toBeTruthy();

      // 4. Verify the email.
      const verifyRes = await api.post('/api/v1/auth/verify-email', {
        data: { verificationToken: tokens.verificationToken },
      });
      expect(verifyRes.ok()).toBe(true);

      // 5. Login now succeeds and returns an access token.
      const verifiedLogin = await api.post('/api/v1/auth/login', {
        data: { email, password: PASSWORD },
      });
      expect(verifiedLogin.ok()).toBe(true);
      const body = (await verifiedLogin.json()) as { tokens?: { accessToken?: string } };
      expect(body.tokens?.accessToken).toBeTruthy();

      // 6. The verification token is single-use — it's cleared after verifying.
      const afterVerify = await peekAuthTokens(email);
      expect(afterVerify.verificationToken).toBeNull();
    } finally {
      await api.dispose();
    }
  });
});
