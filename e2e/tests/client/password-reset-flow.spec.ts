import { test, expect } from '../../fixtures';

test.describe('adopter password reset', () => {
  test('requesting a reset link surfaces a confirmation message', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).first().fill('john.smith@gmail.com');
    await page
      .getByRole('button', { name: /(send|reset|continue)/i })
      .first()
      .click();

    await expect(
      page.getByText(/(check your (email|inbox)|reset link sent|we sent you)/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('the reset page rejects an obviously invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-e2e');
    const newPassword = page.getByLabel(/new password|^password$/i).first();
    if (await newPassword.count()) {
      await newPassword.fill('AnotherPassword123!');
      const confirm = page.getByLabel(/confirm/i).first();
      if (await confirm.count()) {
        await confirm.fill('AnotherPassword123!');
      }
      await page
        .getByRole('button', { name: /(reset|save|update)/i })
        .first()
        .click();
    }
    await expect(page.getByText(/(invalid|expired|not found).*(token|link)/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
