import { generateSync } from 'otplib';

import type { Locator, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { openSettingsSection } from '../../helpers/account-settings';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openSignedInSession } from '../../helpers/signed-in-session';
import {
  enableTwoFactorViaApi,
  loginAsksForTwoFactor,
  nextTotpCode,
} from '../../helpers/two-factor';

// TOTP 2FA set up and switched off from Settings > Two-factor sign-in (lib.auth's
// TwoFactorSettings, inside the shared lib.account settings). The API half is
// covered by admin/2fa-enrollment.spec.ts; this drives the screens. Each test
// uses a throwaway adopter: 2FA gates every later login of the account.

const openTwoFactorSettings = async (page: Page): Promise<Locator> => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  return openSettingsSection(page, 'Two-factor sign-in');
};

test.describe('2FA in the account settings UI', () => {
  test('an adopter sets up 2FA from the authenticator secret and is shown backup codes once', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('twofa-setup-ui');
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      await dismissCookieBannerWhenShown(page);
      const panel = await openTwoFactorSettings(page);
      await expect(panel.getByRole('button', { name: 'Turn on two-factor sign-in' })).toBeVisible();

      const setupAnswered = page.waitForResponse(
        res => res.url().endsWith('/auth/2fa/setup') && res.request().method() === 'POST'
      );
      await panel.getByRole('button', { name: 'Turn on two-factor sign-in' }).click();
      const { secret } = (await (await setupAnswered).json()) as { secret?: string };
      expect(secret).toBeTruthy();

      // The secret is on screen for typing into the authenticator by hand.
      await expect(panel.getByText(secret ?? '', { exact: true })).toBeVisible();

      // The authenticator app's current code (otplib stands in for it).
      await panel.getByPlaceholder('000000').fill(generateSync({ secret: secret ?? '' }));
      await panel.getByRole('button', { name: 'Turn on', exact: true }).click();

      await expect(panel.getByRole('heading', { name: 'Save your backup codes' })).toBeVisible();
      const codes = panel.getByRole('list', { name: 'Your backup codes' }).getByRole('listitem');
      await expect(codes.first()).toBeVisible();
      expect(await codes.count()).toBeGreaterThan(0);

      // Done stays disabled until the user says the codes are saved. The
      // CheckboxInput hides its real <input>, so click the visible label.
      const done = panel.getByRole('button', { name: 'Done' });
      await expect(done).toBeDisabled();
      await panel.getByText("I've saved these backup codes somewhere safe").click();
      await done.click();
      await expect(panel.getByRole('heading', { name: 'Save your backup codes' })).toBeHidden();
      // Settings now say 2FA is on (the gateway used to strip twoFactorEnabled
      // from /auth/me, so this went back to "Off").
      await expect(
        panel.getByRole('button', { name: 'Turn off two-factor sign-in' })
      ).toBeVisible();

      // 2FA is on: a password-only login is now answered with the code challenge.
      expect(await loginAsksForTwoFactor(account)).toBe(true);
    } finally {
      await session.close();
    }
  });

  test('an adopter with 2FA on switches it off with a code from the authenticator', async ({
    browser,
  }) => {
    test.slow();
    const account = await createVerifiedAdopter('twofa-disable-ui');
    // Sign in first: once 2FA is on, a password-only login gets no session.
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      const { secret, usedCode } = await enableTwoFactorViaApi(account);
      await dismissCookieBannerWhenShown(page);
      const panel = await openTwoFactorSettings(page);
      await expect(
        panel.getByRole('button', { name: 'Turn off two-factor sign-in' })
      ).toBeVisible();

      await panel.getByRole('button', { name: 'Turn off two-factor sign-in' }).click();
      await panel.getByPlaceholder('000000').fill(await nextTotpCode(secret, usedCode));
      await panel.getByRole('button', { name: 'Turn off', exact: true }).click();

      await expect(panel.getByRole('button', { name: 'Turn on two-factor sign-in' })).toBeVisible();
      expect(await loginAsksForTwoFactor(account)).toBe(false);
    } finally {
      await session.close();
    }
  });
});
