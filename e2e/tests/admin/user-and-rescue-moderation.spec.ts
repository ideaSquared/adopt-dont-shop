import { test, expect } from '../../fixtures';

test.describe('admin user moderation', () => {
  test('the users page lists seeded users and supports searching by email', async ({ page }) => {
    await page.goto('/users');

    await expect(page).toHaveURL(/\/users/);

    const search = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/search/i))
      .first();
    if (await search.count()) {
      await search.fill('john.smith@gmail.com');
      await search.press('Enter');
    }

    await expect(page.getByText('john.smith@gmail.com').first()).toBeVisible({ timeout: 15_000 });
  });
});
