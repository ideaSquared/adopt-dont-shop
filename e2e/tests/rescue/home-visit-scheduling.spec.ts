import { test, expect } from '../../fixtures';

test.describe('home visit scheduling', () => {
  test('a rescue admin can open the events / home visit page without errors', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/events/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
