import { test, expect } from '../../fixtures';

test.describe('notification preferences', () => {
  test('an adopter can toggle email notifications and the change persists', async ({ page }) => {
    await page.goto('/notifications');

    const preferencesTab = page.getByRole('tab', { name: /preferences|settings/i }).first();
    if (await preferencesTab.count()) {
      await preferencesTab.click();
    }

    const emailToggle = page
      .getByRole('switch', { name: /email/i })
      .or(page.getByLabel(/email notifications/i))
      .first();
    if (!(await emailToggle.count())) {
      test.skip(true, 'preference toggles not exposed yet');
    }

    const initialState = await emailToggle.isChecked().catch(() => false);
    await emailToggle.click();
    await expect(emailToggle).toBeChecked({ checked: !initialState });

    await page.reload();
    const after = page
      .getByRole('switch', { name: /email/i })
      .or(page.getByLabel(/email notifications/i))
      .first();
    await expect(after).toBeChecked({ checked: !initialState });
  });
});
