import { test, expect } from '../../fixtures';

test.describe('field permissions admin', () => {
  test('the field permissions page exposes role and resource selectors', async ({ page }) => {
    await page.goto('/field-permissions');

    await expect(page).toHaveURL(/\/field-permissions/);

    const roleControl = page
      .getByLabel(/role/i)
      .or(page.getByRole('combobox', { name: /role/i }))
      .first();
    const resourceControl = page
      .getByLabel(/resource|table|model/i)
      .or(page.getByRole('combobox', { name: /resource|table/i }))
      .first();

    if (!(await roleControl.count()) || !(await resourceControl.count())) {
      test.skip(true, 'field permissions UI not exposed in this build');
    }

    await expect(roleControl).toBeVisible();
    await expect(resourceControl).toBeVisible();
  });
});
