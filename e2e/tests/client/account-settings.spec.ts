import { request as playwrightRequest, type Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { openSettingsSection } from '../../helpers/account-settings';
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
// Note: the erasure route allows 5 requests per IP per hour by default; the
// e2e stack raises that (GATEWAY_ERASURE_IP_RATE_LIMIT_MAX in
// docker-compose.e2e.yml) because the delete test here and
// rescue/account-settings.spec.ts erase from the one docker-side IP.

const canSignIn = async (email: string, password: string): Promise<boolean> => {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await postWithCsrf(ctx, '/api/v1/auth/login', { email, password });
    return res.ok();
  } finally {
    await ctx.dispose();
  }
};

const openSettings = async (page: Page): Promise<void> => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
};

test.describe('adopter account settings', () => {
  test('lists the shared settings plus the adopter-only Privacy & data section', async ({
    browser,
  }) => {
    const account = await createVerifiedAdopter('settings-tabs');
    const session = await openSignedInSession(browser, account);
    try {
      await openSettings(session.page);

      // Name and phone are edited on the Profile tab, so no "Your details" row.
      await expect(
        session.page.getByRole('list', { name: 'Account settings' }).getByRole('heading')
      ).toHaveText([
        'Email',
        'Password',
        'Two-factor sign-in',
        'Notifications',
        'Theme',
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
      await openSettings(page);
      const notifications = await openSettingsSection(page, 'Notifications');
      // lib.components' CheckboxInput hides the real <input> (0×0, opacity 0)
      // behind a styled box, so click its visible label, as a person would,
      // and read the state from the input (toBeChecked needs no visibility).
      const alertsLabel = notifications.getByText('Browser alerts', { exact: true });
      const alerts = notifications.getByRole('checkbox', { name: /^browser alerts/i });
      await expect(alertsLabel).toBeVisible();
      const alertsWere = await alerts.isChecked();

      await alertsLabel.click();
      await expect(alerts).toBeChecked({ checked: !alertsWere });
      await notifications.getByText('More options').click();
      await notifications.getByLabel('Quiet hours start').fill('22:00');
      await notifications.getByLabel('Quiet hours end').fill('07:00');
      await notifications.getByRole('button', { name: 'Save notification preferences' }).click();
      await expect(notifications.getByText('Notification preferences saved.')).toBeVisible();

      // Before this PR, saved preferences never loaded back (the form read
      // field names the gateway doesn't return), so a reload showed defaults.
      await page.reload();
      await openSettings(page);
      const reloaded = await openSettingsSection(page, 'Notifications');
      await expect(reloaded.getByRole('checkbox', { name: /^browser alerts/i })).toBeChecked({
        checked: !alertsWere,
      });
      await expect(reloaded.getByLabel('Quiet hours start')).toHaveValue('22:00');
      await expect(reloaded.getByLabel('Quiet hours end')).toHaveValue('07:00');
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
      await openSettings(page);
      const password = await openSettingsSection(page, 'Password');
      await password.getByLabel('Current password').fill(account.password);
      await password.getByLabel(/^new password/i).fill(newPassword);
      await password.getByLabel('Confirm new password').fill(newPassword);
      await password.getByRole('button', { name: 'Change password' }).click();

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
      await openSettings(page);
      const email = await openSettingsSection(page, 'Email');
      await email.getByLabel('New email').fill(newEmail);
      await email.getByLabel('Current password').fill(account.password);
      await email.getByRole('button', { name: 'Send confirmation link' }).click();
      await expect(email.getByRole('status')).toContainText(newEmail);

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
      await openSettings(page);
      await page.getByRole('button', { name: 'Delete account…' }).click();
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
