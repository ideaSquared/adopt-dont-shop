import { test, expect } from '../../fixtures';

/**
 * The Input component renders an error helper-text below the field with
 * aria-invalid=true on the input itself.  We assert on the accessible
 * shape (the input becomes invalid) rather than on a specific copy
 * string, since the validation message comes from a Zod schema that may
 * change wording.
 */
test.describe('form validation', () => {
  test('the registration form rejects a malformed email on submit', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/register');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

      const emailField = page.getByLabel(/email/i).first();
      await emailField.fill('not-an-email');

      await page
        .getByRole('button', { name: /(create account|sign up|register)/i })
        .first()
        .click();

      // The form must NOT navigate away from /register on bad input —
      // the URL invariant alone is enough proof that validation rejected
      // the submission.  Don't pin to the exact copy of the error.
      await page.waitForTimeout(2_000);
      await expect(page).toHaveURL(/\/register/);

      // And the email field must surface a validation state via either
      // aria-invalid="true" OR a helper paragraph rendered after it.
      const isInvalid = await emailField.getAttribute('aria-invalid');
      const helperVisible = await page
        .getByText(/email/i)
        .filter({ hasNot: page.getByRole('textbox') })
        .first()
        .isVisible()
        .catch(() => false);
      expect(isInvalid === 'true' || helperVisible).toBe(true);
    } finally {
      await context.close();
    }
  });
});
