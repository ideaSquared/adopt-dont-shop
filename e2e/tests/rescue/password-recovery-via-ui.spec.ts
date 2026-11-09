import { test, expect } from '../../fixtures';
import { canSignIn } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import {
  requestPasswordResetViaUI,
  resetPasswordFromLinkViaUI,
} from '../../helpers/password-recovery';
import { createRescueWithOwner } from '../../helpers/throwaway-rescue';

// Forgot / reset password through the rescue app's own pages (lib.auth's
// shared ForgotPasswordForm and ResetPasswordForm), following the emailed link
// (its token read through the test-only peek seam). Runs signed out, on the
// owner of a throwaway rescue, so no shared persona's password changes.

test.describe('rescue password recovery in the UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a staff member resets a forgotten password from the emailed link; only the new one signs in', async ({
    apiAs,
    page,
  }) => {
    const { owner } = await createRescueWithOwner(await apiAs('admin'), 'ResetStaff');
    const newPassword = 'FreshPassword456!';

    await dismissCookieBannerWhenShown(page);
    await page.goto('/login');
    await requestPasswordResetViaUI(page, owner.email);
    await resetPasswordFromLinkViaUI(page, owner.email, newPassword);

    // The new password signs in through the rescue login form; the old one no
    // longer works.
    await loginViaUI(page, owner.email, newPassword);
    await expect(page).not.toHaveURL(/\/login/);
    expect(await canSignIn(owner.email, owner.password)).toBe(false);
  });
});
