import { test, expect } from '../../fixtures';

test.describe('admin audit log', () => {
  test('the audit page renders for an admin', async ({ page }) => {
    await page.goto('/audit', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/audit/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
