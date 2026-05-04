import { test, expect } from '../../fixtures';

test.describe('admin content management', () => {
  test('the content management page renders for an admin', async ({ page }) => {
    await page.goto('/content');
    await expect(page).toHaveURL(/\/content/);

    // Page heading is "Content Management".
    await expect(
      page.getByRole('heading', { level: 1, name: /content management/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
