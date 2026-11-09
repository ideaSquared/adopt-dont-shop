import { test, expect } from '../../fixtures';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { createRescueWithOwner, inviteStaff } from '../../helpers/throwaway-rescue';

// A staff invitation accepted through the rescue app's /accept-invitation page
// (staff-invitation-roundtrip.spec.ts drives the same journey over the API).
// The admin invites over the API to a throwaway rescue, so the shared Paws
// Rescue's staff list is left alone; the emailed link's token is read through
// the test-only peek seam. Runs signed out, as a brand-new invitee would.

test.describe('staff invitation accepted in the UI', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('an invitee creates their account from the emailed link and signs in', async ({
    apiAs,
    page,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'InviteViaUI');
    const { email, token } = await inviteStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'invitee-ui',
    });
    const password = 'BehaviourTest123!';

    await dismissCookieBannerWhenShown(page);
    await page.goto(`/accept-invitation?token=${encodeURIComponent(token)}`);
    await expect(page.getByRole('heading', { name: 'Join the Team!' })).toBeVisible();
    await expect(page.getByText(`You're registering with: ${email}`)).toBeVisible();

    await page.getByLabel(/^first name/i).fill('Ivy');
    await page.getByLabel(/^last name/i).fill('Invitee');
    await page.getByLabel(/^password/i).fill(password);
    await page.getByLabel(/^confirm password/i).fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByRole('heading', { name: 'Account Created!' })).toBeVisible();

    // The new staff member signs in through the rescue login form.
    await loginViaUI(page, email, password);
    await expect(page).not.toHaveURL(/\/login/);
  });
});
