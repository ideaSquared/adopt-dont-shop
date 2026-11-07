import { test, expect } from '../../fixtures';

test.describe('form validation', () => {
  test('the registration form rejects a malformed email on submit', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/register');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

      // Fill everything else validly, take the browser's own validation out
      // of the way, and submit a malformed email: the app's schema must flag
      // exactly that field and keep the visitor on /register.
      await page.getByRole('textbox', { name: 'First Name*' }).fill('Ava');
      await page.getByRole('textbox', { name: 'Last Name*' }).fill('Adopter');
      const emailField = page.getByRole('textbox', { name: 'Email Address*' });
      await emailField.fill('not-an-email');
      await page.getByRole('textbox', { name: 'Password*', exact: true }).fill('BehaviourTest123!');
      await page.getByRole('textbox', { name: 'Confirm Password*' }).fill('BehaviourTest123!');
      await page.getByRole('checkbox', { name: /terms of service/i }).check();
      await page.locator('form').evaluate(f => {
        (f as HTMLFormElement).noValidate = true;
      });
      await page.getByRole('button', { name: 'Create Account' }).click();

      await expect(emailField).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      await expect(page.locator('form [aria-invalid="true"]')).toHaveCount(1);
      await expect(page).toHaveURL(/\/register/);
    } finally {
      await context.close();
    }
  });
});
