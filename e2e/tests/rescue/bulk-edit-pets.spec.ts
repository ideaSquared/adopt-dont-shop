import { test, expect } from '../../fixtures';

test.describe('rescue analytics dashboard', () => {
  test('a rescue user can open the analytics page and see at least one metric', async ({
    page,
  }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);

    // Page heading is "Analytics & Reporting" — first proof the page mounted.
    await expect(
      page.getByRole('heading', { level: 1, name: /analytics( & reporting)?/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    // Then any metric/chart shape.
    const metric = page
      .getByRole('region')
      .or(page.locator('canvas'))
      .or(page.locator('[data-testid="metric-card"]'))
      .or(page.getByRole('heading', { name: /(applications|pets|adoptions|metrics)/i }))
      .first();
    await expect(metric).toBeVisible({ timeout: 15_000 });
  });
});
