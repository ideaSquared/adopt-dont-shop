import { request as playwrightRequest, type Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { uniqueEmail } from '../../helpers/factories';
import { postWithCsrf } from '../../helpers/seeds';
import { openSignedInSession } from '../../helpers/signed-in-session';
import { peekAuthTokens } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

// The shared account settings (lib.account) as an adopter sees them under
// /profile > Settings. Every test runs on its own throwaway adopter: these
// journeys change the password, the email, notification preferences, or erase
// the account, which must never touch the shared seeded personas.
//
// Note: the erasure route allows 5 requests per IP per hour, and the delete
// test here plus rescue/account-settings.spec.ts spend 2 of them per run.

const canSignIn = async (email: string, password: string): Promise<boolean> => {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', { email, password });
    return res.ok();
  } finally {
    await ctx.dispose();
  }
};

const openSettings = async (page: Page, tab: string): Promise<void> => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: tab, exact: true }).click();
};

// Inactive tab panels stay mounted (hidden); role queries skip hidden
// elements, so this is the panel the user is looking at.
const activePanel = (page: Page) => page.getByRole('tabpanel');

test.describe('adopter account settings', () => {
  test('shows the shared settings tabs plus the adopter-only Privacy & data tab', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('settings-tabs');
    const session = await openSignedInSession(browser, account);
    try {
      await openSettings(session.page, 'Notifications');

      await expect(session.page.getByRole('tab')).toHaveText([
        'Notifications',
        'Security',
        'Appearance',
        'Account',
        'Privacy & data',
      ]);
    } finally {
      await session.close();
    }
  });

  test('notification preferences are saved and still there after a reload', async ({ browser }) => {
    const account = await createVerifiedAdopter('settings-notifications');
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      await openSettings(page, 'Notifications');
      // lib.components' CheckboxInput hides the real <input> (0×0, opacity 0)
      // behind a styled box, so click its visible label, as a person would,
      // and read the state from the input (toBeChecked needs no visibility).
      const pushLabel = activePanel(page).getByText('Push', { exact: true });
      const push = activePanel(page).getByRole('checkbox', { name: /^push/i });
      await expect(pushLabel).toBeVisible();
      const pushWas = await push.isChecked();

      await pushLabel.click();
      await expect(push).toBeChecked({ checked: !pushWas });
      await activePanel(page).getByLabel('Quiet hours start').fill('22:00');
      await activePanel(page).getByLabel('Quiet hours end').fill('07:00');
      await activePanel(page)
        .getByRole('button', { name: 'Save notification preferences' })
        .click();
      await expect(activePanel(page).getByText('Notification preferences saved.')).toBeVisible();

      // Before this PR, saved preferences never loaded back (the form read
      // field names the gateway doesn't return), so a reload showed defaults.
      await page.reload();
      await openSettings(page, 'Notifications');
      await expect(activePanel(page).getByRole('checkbox', { name: /^push/i })).toBeChecked({
        checked: !pushWas,
      });
      await expect(activePanel(page).getByLabel('Quiet hours start')).toHaveValue('22:00');
      await expect(activePanel(page).getByLabel('Quiet hours end')).toHaveValue('07:00');
    } finally {
      await session.close();
    }
  });

  test('changing the password signs the user out; only the new password works', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('settings-password');
    const newPassword = 'NewBehaviour456!';
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      await openSettings(page, 'Security');
      await activePanel(page).getByLabel('Current password').fill(account.password);
      await activePanel(page)
        .getByLabel(/^new password/i)
        .fill(newPassword);
      await activePanel(page).getByLabel('Confirm new password').fill(newPassword);
      await activePanel(page).getByRole('button', { name: 'Change password' }).click();

      // Changing the password ends every session, this one included.
      await expect(page).toHaveURL(/\/login/);
      expect(await canSignIn(account.email, newPassword)).toBe(true);
      expect(await canSignIn(account.email, account.password)).toBe(false);
    } finally {
      await session.close();
    }
  });

  test('changing the email: confirm through the emailed link, then sign in with the new address', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('settings-email-old');
    const newEmail = uniqueEmail('settings-email-new');
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      await openSettings(page, 'Account');
      await activePanel(page).getByLabel('New email').fill(newEmail);
      await activePanel(page).getByLabel('Current password').fill(account.password);
      await activePanel(page).getByRole('button', { name: 'Send confirmation link' }).click();
      await expect(activePanel(page).getByRole('status')).toContainText(newEmail);

      // Nothing changes until the link is followed.
      expect(await canSignIn(account.email, account.password)).toBe(true);

      // The link goes to the new inbox; read its token through the peek seam
      // (looked up by the CURRENT email).
      const { emailChangeToken } = await peekAuthTokens(account.email);
      expect(emailChangeToken).toBeTruthy();
      await page.goto(`/confirm-email-change?token=${encodeURIComponent(emailChangeToken ?? '')}`);

      // The page waits for a click: link scanners open emailed links, and a
      // one-time token spent on page load would be gone.
      await page.getByRole('button', { name: 'Confirm new email' }).click();
      await expect(page.getByRole('heading', { name: 'Email changed' })).toBeVisible();

      expect(await canSignIn(newEmail, account.password)).toBe(true);
      expect(await canSignIn(account.email, account.password)).toBe(false);
    } finally {
      await session.close();
    }
  });

  test('deleting the account signs the user out and the account can no longer sign in', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('settings-delete');
    const session = await openSignedInSession(browser, account);
    const { page } = session;
    try {
      await openSettings(page, 'Account');
      await activePanel(page).getByRole('button', { name: 'Delete account…' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Current password').fill(account.password);
      await dialog.getByRole('button', { name: 'Delete my account' }).click();

      await expect(page).toHaveURL(`${URLS.client}/`);
      // Erasure runs as an asynchronous saga across the services.
      await expect
        .poll(() => canSignIn(account.email, account.password), { timeout: 30_000 })
        .toBe(false);
    } finally {
      await session.close();
    }
  });
});
