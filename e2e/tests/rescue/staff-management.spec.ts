import { test, expect } from '../../fixtures';

test.describe('rescue staff management', () => {
  test('a rescue admin can open the staff management page', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
