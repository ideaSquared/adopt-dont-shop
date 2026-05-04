import { test, expect } from '../../fixtures';

test.describe('home visit scheduling', () => {
  test('a rescue admin can open the events / home visit page without errors', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);

    // The page heading is "Event Management" — first proof the page mounted.
    await expect(
      page.getByRole('heading', { level: 1, name: /event management/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
