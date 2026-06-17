import { test, expect } from '../../fixtures';

test.describe('admin content management', () => {
  test('the content management page renders for an admin', async ({ page }) => {
    // The admin app mounts content management at /content-management
    // (apps/admin/src/App.tsx); /content is not a route.
    await page.goto('/content-management', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/content-management/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
