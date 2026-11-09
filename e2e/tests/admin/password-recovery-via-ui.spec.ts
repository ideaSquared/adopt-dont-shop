import { test, expect } from '../../fixtures';
import { canSignIn, createThrowawayAdmin } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import {
  requestPasswordResetViaUI,
  resetPasswordFromLinkViaUI,
} from '../../helpers/password-recovery';

// Forgot / reset password through the admin app's own pages (lib.auth's shared
// ForgotPasswordForm and ResetPasswordForm), following the emailed link (its
// token read through the test-only peek seam). Runs signed out, on a throwaway
// admin, never the seeded super admin the rest of the suite signs in as.

test.describe('admin password recovery in the UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an admin resets a forgotten password from the emailed link; only the new one signs in', async ({
    apiAs,
    page,
  }) => {
    const admin = await createThrowawayAdmin(await apiAs('admin'), 'reset-admin');
    const newPassword = 'FreshPassword456!';

    await dismissCookieBannerWhenShown(page);
    await page.goto('/login');
    await requestPasswordResetViaUI(page, admin.email);
    await resetPasswordFromLinkViaUI(page, admin.email, newPassword);

    // The new password signs in through the admin login form; the old one no
    // longer works.
    await loginViaUI(page, admin.email, newPassword);
    await expect(page).not.toHaveURL(/\/login/);
    expect(await canSignIn(admin.email, admin.password)).toBe(false);
  });
});
