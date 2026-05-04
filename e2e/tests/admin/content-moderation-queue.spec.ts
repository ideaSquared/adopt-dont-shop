import { test, expect } from '../../fixtures';

test.describe('moderation queue', () => {
  test('the moderation page renders for an admin', async ({ page }) => {
    await page.goto('/moderation', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/moderation/);

    // Any heading at all proves the SPA mounted.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
