import { test, expect } from '../../fixtures';
import { createThrowawayAdmin } from '../../helpers/accounts';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { enableTwoFactorViaApi, nextTotpCode } from '../../helpers/two-factor';

// The 2FA challenge driven through the admin app's login form (lib.auth's
// LoginForm, as in client/2fa-login-ui.spec.ts). 2FA is turned on over the API
// for a throwaway admin, never the seeded super admin the suite signs in as.

test.describe('2FA via the admin login UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an admin with 2FA on is asked for a TOTP code and signs in', async ({ apiAs, page }) => {
    // Up to 35s waiting for the TOTP step to roll over, on top of the journey.
    test.slow();
    const admin = await createThrowawayAdmin(await apiAs('admin'), 'twofa-admin');
    const { secret, usedCode } = await enableTwoFactorViaApi(admin);

    await dismissCookieBannerWhenShown(page);
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(admin.email);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // The form swaps to the code prompt instead of signing in.
    const codeField = page.getByPlaceholder('000000');
    await expect(codeField).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);

    await codeField.fill(await nextTotpCode(secret, usedCode));
    await page.getByRole('button', { name: 'Verify', exact: true }).click();

    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
});
