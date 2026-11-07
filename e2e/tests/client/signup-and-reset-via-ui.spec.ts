import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { uniqueEmail } from '../../helpers/factories';
import { peekAuthTokens } from '../../helpers/token-peek';

const RESET_REQUEST_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 20_000;

/**
 * Submit the forgot-password form and wait for the gateway's answer. The
 * route allows 5 requests a minute per source IP and the page shows the same
 * "Check Your Email" screen for a 429 (so the response can't be used to
 * enumerate accounts), which means a rate-limited request looks like success
 * but mints no token. On a shared stack other specs spend that budget, so
 * when the gateway says 429 wait out the window and ask again.
 */
async function requestResetEmail(page: Page, email: string): Promise<void> {
  for (let attempt = 1; attempt <= RESET_REQUEST_ATTEMPTS; attempt += 1) {
    await page.goto('/forgot-password');
    await dismissCookieBannerWhenShown(page);
    await page.getByRole('textbox', { name: /email address/i }).fill(email);
    const answered = page.waitForResponse(
      res => res.url().endsWith('/auth/forgot-password') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Send Reset Instructions' }).click();
    const response = await answered;
    const status = response.status();
    if (status !== 429) {
      expect(status, 'POST /auth/forgot-password').toBeLessThan(300);
      await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible();
      return;
    }
    await page.waitForTimeout(
      Number(response.headers()['retry-after'] ?? 0) * 1000 || RATE_LIMIT_WINDOW_MS
    );
  }
  throw new Error(
    `POST /auth/forgot-password was rate limited (429) on all ${RESET_REQUEST_ATTEMPTS} attempts`
  );
}

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
    await dismissCookieBannerWhenShown(page);
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
    test.setTimeout(150_000);
    const account = await createVerifiedAdopter('reset-ui');
    const newPassword = 'FreshPassword456!';

    await requestResetEmail(page, account.email);

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
