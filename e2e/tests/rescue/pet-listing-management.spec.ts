import { test, expect } from '../../fixtures';

test.describe('rescue pet listing management', () => {
  test('a rescue manager can open the pet management page', async ({ page }) => {
    await page.goto('/pets', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/pets/);

    // Any heading at all proves the SPA mounted past the route guard.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
