import { generateSync } from 'otplib';

import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { uniqueEmail } from '../../helpers/factories';
import { URLS } from '../../playwright.config';

/**
 * 2FA challenge driven through the client login UI.
 *
 * The admin/2fa-enrollment.spec.ts spec proves the API enforcement contract
 * (login → two_factor_required → no tokens). This spec proves the OTHER half:
 * lib.auth's LoginForm renders a 2FA code prompt (needs2FA state) when the
 * login returns two_factor_required, and a fresh TOTP code completes the login.
 *
 * Why a throwaway account: enabling 2FA gates that account's future logins, so
 * we must NOT touch a shared seeded persona (global-setup signs those in via
 * the UI). A freshly-registered user is owned entirely by this test. We also
 * clear storageState so the page starts anonymous on /login.
 */
test.describe('2FA via the login UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a user with 2FA enabled is prompted for a TOTP code and logs in', async ({ page }) => {
    const email = uniqueEmail('twofa-ui');
    const password = 'BehaviourTest123!';

    // Register the throwaway account and enable 2FA — all via API. The UI part
    // is the login challenge below.
    const api = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const reg = await api.post('/api/v1/auth/register', {
        data: {
          email,
          password,
          firstName: 'E2E',
          lastName: 'TwoFAUI',
          termsAccepted: true,
          privacyPolicyAccepted: true,
        },
      });
      expect([200, 201]).toContain(reg.status());

      const loginRes = await api.post('/api/v1/auth/login', { data: { email, password } });
      expect(loginRes.ok()).toBe(true);
      const loginBody = (await loginRes.json()) as { tokens?: { accessToken?: string } };
      const accessToken = loginBody.tokens?.accessToken;
      expect(accessToken).toBeTruthy();

      const authed = await playwrightRequest.newContext({
        baseURL: URLS.api,
        extraHTTPHeaders: { Authorization: `Bearer ${accessToken!}` },
      });
      try {
        const setupRes = await authed.post('/api/v1/auth/2fa/setup');
        expect(setupRes.ok()).toBe(true);
        const { secret } = (await setupRes.json()) as { secret?: string };
        expect(secret).toBeTruthy();

        const enableRes = await authed.post('/api/v1/auth/2fa/enable', {
          data: { secret, token: generateSync({ secret: secret! }) },
        });
        expect(enableRes.ok()).toBe(true);

        // Drive the login UI. Step 1: email + password.
        await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.getByLabel('Email Address').fill(email);
        await page.getByLabel('Password').fill(password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Step 2: the form detects two_factor_required and shows the code field.
        const codeField = page.getByPlaceholder('000000');
        await expect(codeField).toBeVisible({ timeout: 20_000 });

        // Fill a fresh code (generated just before submit so it is current),
        // then verify. A correct code completes the login and leaves /login.
        await codeField.fill(generateSync({ secret: secret! }));
        await page.getByRole('button', { name: /verify/i }).click();

        await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 });
        await expect(page).not.toHaveURL(/\/login/);
      } finally {
        await authed.dispose();
      }
    } finally {
      await api.dispose();
    }
  });
});
