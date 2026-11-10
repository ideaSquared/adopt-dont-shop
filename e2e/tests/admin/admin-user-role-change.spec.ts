import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { chooseSelectOption } from '../../helpers/radix-select';

/**
 * An admin changes a user's role from the Edit tab of the Users page detail
 * panel and the new role applies to that user. Runs on a freshly registered
 * adopter so no seeded persona changes role.
 */
test.describe('changing a user role in the admin app', () => {
  test('an admin promotes an adopter to moderator and the new role applies', async ({ page }) => {
    const target = await createVerifiedAdopter('role-change');

    await dismissCookieBannerPatiently(page);
    await page.goto('/users');
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(target.email);
    // Wait for the debounced search to settle (header row + the one match).
    await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });
    const row = page.getByRole('row').filter({ hasText: target.email });
    await row.getByRole('cell').filter({ hasText: target.email }).click();

    await page.getByRole('tab', { name: 'Edit' }).click();
    await chooseSelectOption(page, page.getByLabel('Role'), 'Moderator');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(row.getByRole('cell', { name: 'Moderator' })).toBeVisible({ timeout: 15_000 });

    const targetApi = await loginAccountViaApi(target);
    try {
      const me = await targetApi.context.get('/api/v1/auth/me');
      expect(me.ok()).toBe(true);
      expect(JSON.stringify(await me.json())).toContain('moderator');
    } finally {
      await targetApi.dispose();
    }
  });
});
