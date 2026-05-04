import { test, expect } from '../../fixtures';

test.describe('moderation queue', () => {
  test('the moderation page renders for an admin', async ({ page }) => {
    await page.goto('/moderation');
    await expect(page).toHaveURL(/\/moderation/);

    // Page heading is "Content Moderation".
    await expect(
      page.getByRole('heading', { level: 1, name: /content moderation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
