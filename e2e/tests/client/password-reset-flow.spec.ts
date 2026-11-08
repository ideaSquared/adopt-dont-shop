import { test, expect } from '../../fixtures';

test.describe('adopter password reset', () => {
  test('requesting a reset link surfaces a confirmation message', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/email/i).first().fill('john.smith@gmail.com');
    await page
      .getByRole('button', { name: /(send|reset|continue|submit)/i })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the reset page rejects an obviously invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-e2e');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('New Password', { exact: true }).fill('AnotherPassword123!');
    await page.getByLabel('Confirm New Password').fill('AnotherPassword123!');
    await page.getByRole('button', { name: 'Reset Password' }).click();

    await expect(page.getByText(/failed to reset password/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole('heading', { name: /successful/i })).toHaveCount(0);
  });
});
