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

    // Look for either an explicit confirmation, or the "Check Your Email"
    // h2 the page renders on success.
    const confirmation = page
      .getByText(/(check your (email|inbox)|reset link sent|we sent you|email .* sent)/i)
      .first();
    const checkEmailHeading = page.getByRole('heading', { name: /check your email/i }).first();
    await expect(confirmation.or(checkEmailHeading)).toBeVisible({ timeout: 20_000 });
  });

  test('the reset page rejects an obviously invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token-e2e');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    // The page may render the form (and only fail on submit) or show the
    // invalid-token error inline immediately.  Try both paths.
    const passwordFields = page.locator('input[type="password"]');
    if (await passwordFields.count()) {
      await passwordFields.nth(0).fill('AnotherPassword123!');
      if ((await passwordFields.count()) > 1) {
        await passwordFields.nth(1).fill('AnotherPassword123!');
      }
      await page
        .getByRole('button', { name: /(reset|save|update|submit)/i })
        .first()
        .click();
    }

    await expect(
      page
        .getByText(/(invalid|expired|not found|missing).*(token|link|reset)/i)
        .or(page.getByText(/please request a new password reset/i))
        .first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
