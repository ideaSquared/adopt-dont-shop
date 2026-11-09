import { test, expect } from '../../fixtures';
import { canSignIn, createThrowawayAdmin } from '../../helpers/accounts';
import { openSettingsSection, settingsRow } from '../../helpers/account-settings';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { confirmEmailChangeFromLink } from '../../helpers/email-change';
import { uniqueEmail } from '../../helpers/factories';
import { URLS } from '../../playwright.config';

// The shared account settings (lib.account) at /account in the admin app.
// The first two tests are read-only on the seeded super admin the rest of the
// suite signs in as. The journeys that change the password or email, or erase
// the account, each run on a throwaway admin of their own (createThrowawayAdmin),
// because doing that to the shared persona would break other specs.
//
// Note: the erasure route allows 5 requests per IP per hour by default; the
// e2e stack raises that (GATEWAY_ERASURE_IP_RATE_LIMIT_MAX in
// docker-compose.e2e.yml), and the delete test here erases from the same
// docker-side IP as the client and rescue account-settings specs.

test.describe('admin account settings', () => {
  test('lists every setting with its current value, all closed', async ({ page }) => {
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Account settings' }).getByRole('heading')
    ).toHaveText([
      'Your details',
      'Email',
      'Password',
      'Two-factor sign-in',
      'Notifications',
      'Theme',
    ]);
    // Notification preferences load into the row's summary.
    await expect(settingsRow(page, 'Notifications')).toContainText(/Email (on|off)/);
    await expect(page.getByLabel('New email')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Delete account…' })).toBeVisible();
  });

  test('a Change button opens just that setting', async ({ page }) => {
    await page.goto('/account');

    const details = await openSettingsSection(page, 'Your details');
    await expect(details.getByLabel('First name')).toBeVisible();

    await openSettingsSection(page, 'Email');
    await expect(page.getByLabel('New email')).toBeVisible();
    await expect(page.getByLabel('First name')).toBeHidden();
  });

  test('changing the password signs the admin out; only the new password works', async ({
    apiAs,
    browser,
  }) => {
    const admin = await createThrowawayAdmin(await apiAs('admin'), 'settings-admin-password');
    const newPassword = 'NewBehaviour456!';
    const context = await openAccountContext(browser, admin, URLS.admin);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/account');
      const password = await openSettingsSection(page, 'Password');
      await password.getByLabel('Current password').fill(admin.password);
      await password.getByLabel(/^new password/i).fill(newPassword);
      await password.getByLabel('Confirm new password').fill(newPassword);
      await password.getByRole('button', { name: 'Change password' }).click();

      // Changing the password ends every session, this one included.
      await expect(page).toHaveURL(/\/login/);
      expect(await canSignIn(admin.email, newPassword)).toBe(true);
      expect(await canSignIn(admin.email, admin.password)).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('changing the email: confirm through the emailed link, then sign in with the new address', async ({
    apiAs,
    browser,
  }) => {
    const admin = await createThrowawayAdmin(await apiAs('admin'), 'settings-admin-email-old');
    const newEmail = uniqueEmail('settings-admin-email-new');
    const context = await openAccountContext(browser, admin, URLS.admin);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/account');
      const email = await openSettingsSection(page, 'Email');
      await email.getByLabel('New email').fill(newEmail);
      await email.getByLabel('Current password').fill(admin.password);
      await email.getByRole('button', { name: 'Send confirmation link' }).click();
      await expect(email.getByText(`Check your inbox at ${newEmail}`)).toBeVisible();

      // Nothing changes until the link is followed.
      expect(await canSignIn(admin.email, admin.password)).toBe(true);

      await confirmEmailChangeFromLink(browser, admin.email);

      expect(await canSignIn(newEmail, admin.password)).toBe(true);
      expect(await canSignIn(admin.email, admin.password)).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('deleting the account signs the admin out and the account can no longer sign in', async ({
    apiAs,
    browser,
  }) => {
    const admin = await createThrowawayAdmin(await apiAs('admin'), 'settings-admin-delete');
    const context = await openAccountContext(browser, admin, URLS.admin);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/account');
      await page.getByRole('button', { name: 'Delete account…' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Current password').fill(admin.password);
      await dialog.getByRole('button', { name: 'Delete my account' }).click();

      // Signed out and sent back to the app root, which signed out is the login.
      await expect(page).toHaveURL(/\/login/);
      // Erasure runs as an asynchronous saga across the services.
      await expect
        .poll(() => canSignIn(admin.email, admin.password), { timeout: 30_000 })
        .toBe(false);
    } finally {
      await context.close();
    }
  });
});
