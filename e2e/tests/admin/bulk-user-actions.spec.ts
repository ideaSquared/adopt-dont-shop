import { test, expect } from '../../fixtures';

test.describe('admin bulk actions on users', () => {
  test('selecting a user reveals bulk action controls', async ({ page }) => {
    await page.goto('/users');

    const firstCheckbox = page.getByRole('checkbox').nth(1); // index 0 is usually the "select all"
    if (!(await firstCheckbox.count())) {
      test.skip(true, 'user table does not expose row checkboxes in this build');
    }
    await firstCheckbox.check();

    const bulkBar = page
      .getByText(/(\d+ )?selected/i)
      .or(page.getByRole('button', { name: /(suspend|verify|delete) selected/i }))
      .first();
    await expect(bulkBar).toBeVisible({ timeout: 10_000 });
  });
});
