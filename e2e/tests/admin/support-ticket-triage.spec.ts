import { test, expect } from '../../fixtures';

test.describe('admin support ticket triage', () => {
  test('the support page renders for an admin', async ({ page }) => {
    await page.goto('/support', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/support/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });
});
