import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { uniqueEmail } from '../../helpers/factories';
import { peekAuthTokens } from '../../helpers/token-peek';

/**
 * Account sign-up and password reset through the client UI, following the
 * emailed links (read through the test-only token-peek seam).
 *
 * The existing round-trip specs drive these through the API. In the browser
 * every step was broken: the sign-up form failed its own validation on the
 * hidden (empty) phone field and silently did nothing, and once past that it
 * never sent the terms/privacy consent the gateway requires; the verify-email
 * and reset-password pages posted `{ token }` where the gateway reads
 * `verificationToken` / `resetToken`.
 */
test.describe('account sign-up and recovery in the UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a visitor signs up, verifies their email from the link and logs in @smoke', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-ui');
    const password = 'BehaviourTest123!';

    await page.goto('/register');
    await page.getByRole('button', { name: 'Essentials only' }).click();
    await page.getByRole('textbox', { name: 'First Name*' }).fill('Ava');
    await page.getByRole('textbox', { name: 'Last Name*' }).fill('Adopter');
    await page.getByRole('textbox', { name: 'Email Address*' }).fill(email);
    await page.getByRole('textbox', { name: 'Password*', exact: true }).fill(password);
    await page.getByRole('textbox', { name: 'Confirm Password*' }).fill(password);
    await page.getByRole('checkbox', { name: /terms of service/i }).check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/check-your-email/, { timeout: 15_000 });

    const { verificationToken } = await peekAuthTokens(email);
    expect(verificationToken).toBeTruthy();
    await page.goto(`/verify-email?token=${verificationToken}`);
    await expect(page.getByRole('heading', { name: 'Email Verified!' })).toBeVisible({
      timeout: 15_000,
    });

    await loginViaUI(page, email, password);
    await expect(page.getByRole('button', { name: /user menu for ava adopter/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('a user resets a forgotten password from the emailed link and logs in with it', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('reset-ui');
    const newPassword = 'FreshPassword456!';

    await page.goto('/forgot-password');
    await page.getByRole('button', { name: 'Essentials only' }).click();
    await page.getByRole('textbox', { name: /email address/i }).fill(account.email);
    await page.getByRole('button', { name: 'Send Reset Instructions' }).click();
    await expect(page.getByText(/check your email|instructions/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const { resetToken } = await peekAuthTokens(account.email);
    expect(resetToken).toBeTruthy();
    await page.goto(`/reset-password?token=${resetToken}`);
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm New Password').fill(newPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

    await loginViaUI(page, account.email, newPassword);
    await expect(page).not.toHaveURL(/\/login/);
  });
});
