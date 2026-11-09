import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { openSettingsSection } from '../../helpers/account-settings';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { confirmEmailChangeFromLink } from '../../helpers/email-change';
import { uniqueEmail } from '../../helpers/factories';
import { postWithCsrf } from '../../helpers/seeds';
import { createRescueWithOwner } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

// The shared account settings (lib.account) at /user-settings in the rescue
// app. Each test uses a rescue of its own whose owner is its only staff
// member, so nothing here touches the shared Paws Rescue or its personas.

const canSignIn = async (email: string, password: string): Promise<boolean> => {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', { email, password });
    return res.ok();
  } finally {
    await ctx.dispose();
  }
};

test.describe('rescue staff account settings', () => {
  test('the only staff member of a rescue cannot delete their account', async ({
    apiAs,
    browser,
  }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'SoleStaff');
    const context = await openAccountContext(browser, rescue.owner, URLS.rescue);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/user-settings');
      await page.getByRole('button', { name: 'Delete account…' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Current password').fill(rescue.owner.password);
      await dialog.getByRole('button', { name: 'Delete my account' }).click();

      // Erasing the last staff member would orphan the rescue (409
      // last_rescue_staff from the erasure route).
      await expect(dialog.getByText(/last staff member of your rescue/i)).toBeVisible();
      expect(await canSignIn(rescue.owner.email, rescue.owner.password)).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('staff can change their name from account settings', async ({ apiAs, browser }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'RenameStaff');
    const context = await openAccountContext(browser, rescue.owner, URLS.rescue);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/user-settings');
      const details = await openSettingsSection(page, 'Your details');
      await details.getByLabel('First name').fill('Renamed');
      await details.getByRole('button', { name: 'Save details' }).click();
      await expect(details.getByText('Details saved.')).toBeVisible();

      // The open section lives in the URL hash, so a reload reopens it.
      await page.reload();
      await expect(details.getByLabel('First name')).toHaveValue('Renamed');
    } finally {
      await context.close();
    }
  });

  test('changing the password signs staff out; only the new password works', async ({
    apiAs,
    browser,
  }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'PasswordStaff');
    const { owner } = rescue;
    const newPassword = 'NewBehaviour456!';
    const context = await openAccountContext(browser, owner, URLS.rescue);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/user-settings');
      const password = await openSettingsSection(page, 'Password');
      await password.getByLabel('Current password').fill(owner.password);
      await password.getByLabel(/^new password/i).fill(newPassword);
      await password.getByLabel('Confirm new password').fill(newPassword);
      await password.getByRole('button', { name: 'Change password' }).click();

      // Changing the password ends every session, this one included.
      await expect(page).toHaveURL(/\/login/);
      expect(await canSignIn(owner.email, newPassword)).toBe(true);
      expect(await canSignIn(owner.email, owner.password)).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('changing the email: confirm through the emailed link, then sign in with the new address', async ({
    apiAs,
    browser,
  }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'EmailStaff');
    const { owner } = rescue;
    const newEmail = uniqueEmail('staff-email-new');
    const context = await openAccountContext(browser, owner, URLS.rescue);
    try {
      const page = await context.newPage();
      // The fixed cookie banner covers buttons at the bottom of the page.
      await dismissCookieBannerWhenShown(page);
      await page.goto('/user-settings');
      const email = await openSettingsSection(page, 'Email');
      await email.getByLabel('New email').fill(newEmail);
      await email.getByLabel('Current password').fill(owner.password);
      await email.getByRole('button', { name: 'Send confirmation link' }).click();
      await expect(email.getByText(`Check your inbox at ${newEmail}`)).toBeVisible();

      // Nothing changes until the link is followed.
      expect(await canSignIn(owner.email, owner.password)).toBe(true);

      await confirmEmailChangeFromLink(browser, owner.email);

      expect(await canSignIn(newEmail, owner.password)).toBe(true);
      expect(await canSignIn(owner.email, owner.password)).toBe(false);
    } finally {
      await context.close();
    }
  });
});
