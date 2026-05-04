import { test, expect } from '../../fixtures';

test.describe('rescue staff management', () => {
  test('a rescue admin can open the staff management page', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff/);

    // Page heading is "Staff & Volunteer Management".
    await expect(
      page.getByRole('heading', { level: 1, name: /staff (& volunteer )?management/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
