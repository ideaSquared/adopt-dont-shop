import { test, expect } from '../../fixtures';

/**
 * The Input component renders required fields with an asterisk inside
 * the label, so the accessible name becomes "Password *" rather than
 * exact "Password" — use a tolerant regex.
 */
test.describe('form validation', () => {
  test('the registration form surfaces an inline error for an invalid email', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/register');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

      const emailField = page.getByLabel(/email/i).first();
      await emailField.fill('not-an-email');
      // Trigger validation by tabbing out of the field.
      await emailField.blur();

      // Either an inline "invalid email" hint OR the submit button stays
      // disabled / surfaces an error after submit.  Try blur first; if
      // nothing surfaces, click submit and look for any error text.
      const inlineError = page.getByText(/(invalid|valid|please enter a valid).*email/i).first();

      const inlineVisible = await inlineError
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (!inlineVisible) {
        await page
          .getByRole('button', { name: /(create account|sign up|register)/i })
          .first()
          .click();
        await expect(inlineError).toBeVisible({ timeout: 10_000 });
      }
    } finally {
      await context.close();
    }
  });
});
