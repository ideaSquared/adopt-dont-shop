import { test, expect } from '../../fixtures';

test.describe('form validation', () => {
  test('the registration form surfaces an inline error for an invalid email', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/register');
      await page
        .getByLabel(/^email/i)
        .first()
        .fill('not-an-email');
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill('Pw1!');
      // Trigger validation by leaving the email field
      await page
        .getByLabel(/^password$/i)
        .first()
        .blur();

      await expect(page.getByText(/(invalid|valid) email/i).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await context.close();
    }
  });
});
