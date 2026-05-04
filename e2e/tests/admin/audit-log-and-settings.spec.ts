import { test, expect } from '../../fixtures';

test.describe('admin audit log', () => {
  test('the audit page renders for an admin', async ({ page }) => {
    await page.goto('/audit');
    await expect(page).toHaveURL(/\/audit/);

    // Page heading is "Audit Logs".
    await expect(page.getByRole('heading', { level: 1, name: /audit logs/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
