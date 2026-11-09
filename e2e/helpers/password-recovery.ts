import { expect, type Page } from '@playwright/test';

import { peekAuthTokens } from './token-peek';

const RESET_REQUEST_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 20_000;

/**
 * Starting on the sign-in page of the rescue or admin app, follow "Forgot your
 * password?" and request a reset link with lib.auth's shared
 * ForgotPasswordForm, until it answers "Check your email". The route is rate
 * limited per source IP; on a 429 the form says so, so wait out the window
 * and send again.
 */
export async function requestPasswordResetViaUI(page: Page, email: string): Promise<void> {
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await page.getByLabel('Email Address').fill(email);

  for (let attempt = 1; attempt <= RESET_REQUEST_ATTEMPTS; attempt += 1) {
    const answered = page.waitForResponse(
      res => res.url().endsWith('/auth/forgot-password') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Send reset link' }).click();
    const response = await answered;
    if (response.status() !== 429) {
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
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
 * Open the emailed reset link (its token read through the peek seam) in the
 * current app and choose a new password with lib.auth's shared
 * ResetPasswordForm, until it answers "Password updated".
 */
export async function resetPasswordFromLinkViaUI(
  page: Page,
  email: string,
  newPassword: string
): Promise<void> {
  const { resetToken } = await peekAuthTokens(email);
  expect(resetToken, `no reset token outstanding for ${email}`).toBeTruthy();
  await page.goto(`/reset-password?token=${encodeURIComponent(resetToken ?? '')}`);
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel(/^new password/i).fill(newPassword);
  await page.getByLabel(/^confirm new password/i).fill(newPassword);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();
}
