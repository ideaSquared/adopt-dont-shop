import { test, expect } from '../../fixtures';

test.describe('rescue analytics dashboard', () => {
  test('a rescue user can open the analytics page and see at least one metric', async ({
    page,
  }) => {
    await page.goto('/analytics');

    await expect(page).toHaveURL(/\/analytics/);

    // We assert on user-observable shape: at least one metric / chart / table is visible.
    const metric = page
      .getByRole('region')
      .or(page.locator('[data-testid="metric-card"]'))
      .or(page.locator('canvas'))
      .or(page.getByRole('heading', { name: /applications|pets|adoptions/i }))
      .first();
    await expect(metric).toBeVisible({ timeout: 15_000 });
  });
});
