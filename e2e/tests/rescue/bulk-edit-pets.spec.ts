import { test, expect } from '../../fixtures';

test.describe('rescue analytics dashboard', () => {
  test('a rescue user can open the analytics page', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/analytics/);

    // Any heading at all is sufficient — proves the SPA mounted past
    // the route guard.  Don't pin to specific copy.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
