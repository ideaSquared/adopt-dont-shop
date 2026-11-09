import { test, expect } from '../../fixtures';

// The shared account settings (lib.account) at /account in the admin app.
// Read-only on purpose: the admin persona is the seeded super admin that the
// rest of the suite signs in as, so changing its password or email, or trying
// to delete it, would break other specs. Those journeys are covered on
// throwaway accounts in client/account-settings.spec.ts.

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
});
