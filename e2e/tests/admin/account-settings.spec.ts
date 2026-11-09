import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { canSignIn, createThrowawayAdmin } from '../../helpers/accounts';
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

// Inactive tab panels stay mounted (hidden); role queries skip hidden
// elements, so this is the panel the user is looking at.
const activePanel = (page: Page) => page.getByRole('tabpanel');

const openTab = async (page: Page, tab: string): Promise<void> => {
  await page.goto('/account');
  await page.getByRole('tab', { name: tab, exact: true }).click();
};

test.describe('admin account settings', () => {
  test('shows the same settings tabs as the other apps, with notifications loaded', async ({
    page,
  }) => {
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveText([
      'Notifications',
      'Security',
      'Appearance',
      'Account',
    ]);
    // The Email channel's label (CheckboxInput hides the real <input>).
    await expect(page.getByRole('tabpanel').getByText('Email', { exact: true })).toBeVisible();
  });

  test('the Account tab offers details, email change and delete', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('tab', { name: 'Account', exact: true }).click();
    const panel = page.getByRole('tabpanel');

    await expect(panel.getByLabel('First name')).toBeVisible();
    await expect(panel.getByLabel('New email')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Delete account…' })).toBeVisible();
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
      await openTab(page, 'Security');
      await activePanel(page).getByLabel('Current password').fill(admin.password);
      await activePanel(page)
        .getByLabel(/^new password/i)
        .fill(newPassword);
      await activePanel(page).getByLabel('Confirm new password').fill(newPassword);
      await activePanel(page).getByRole('button', { name: 'Change password' }).click();

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
      await openTab(page, 'Account');
      await activePanel(page).getByLabel('New email').fill(newEmail);
      await activePanel(page).getByLabel('Current password').fill(admin.password);
      await activePanel(page).getByRole('button', { name: 'Send confirmation link' }).click();
      await expect(activePanel(page).getByText(`Check your inbox at ${newEmail}`)).toBeVisible();

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
      await openTab(page, 'Account');
      await activePanel(page).getByRole('button', { name: 'Delete account…' }).click();
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
