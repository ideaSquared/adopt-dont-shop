import { test, expect } from '../../fixtures';

test.describe('admin content management', () => {
  test('the content management page renders for an admin', async ({ page }) => {
    await page.goto('/content', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/content/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
