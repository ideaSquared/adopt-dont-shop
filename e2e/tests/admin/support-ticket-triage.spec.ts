import { test, expect } from '../../fixtures';

test.describe('admin support ticket triage', () => {
  test('the support page renders for an admin', async ({ page }) => {
    await page.goto('/support');
    await expect(page).toHaveURL(/\/support/);

    // Page heading is "Support Tickets".
    await expect(
      page.getByRole('heading', { level: 1, name: /support tickets/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
