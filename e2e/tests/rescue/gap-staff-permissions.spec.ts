import { test, expect } from '../../fixtures';
import { loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { createAdopterApplication } from '../../helpers/seeds';
import { createRescueWithOwner, inviteAndAcceptStaff } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

/**
 * RES-034: a limited staff member cannot approve or reject applications.
 * RES-044: a staff member who is not a manager cannot manage staff.
 *
 * Both are written the way the manual plan expects them to behave. They are
 * test.fail today because the app has no limited staff role: the only rescue
 * role, rescue_staff, holds every staff and application permission, so a
 * "Volunteer" can do everything the manager can. Remove test.fail once a
 * limited role exists and is withheld those permissions.
 */
test.describe('a limited staff member', () => {
  // Creating a rescue and its staff accepts invitations, which the gateway rate limits
  // (10 a minute per IP, shared with every other spec); a retry can wait out the window.
  test.describe.configure({ timeout: 180_000 });

  test.fail('RES-044: sees no staff management controls on /staff', async ({ browser, apiAs }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'Limited');
    const volunteer = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'res044-volunteer',
    });
    const context = await openAccountContext(browser, volunteer, URLS.rescue);
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);
      await page.goto('/staff');
      // The team has loaded: the manager is listed.
      await expect(
        page.getByRole('main').getByText(rescue.owner.email, { exact: true })
      ).toBeVisible({ timeout: 30_000 });

      await expect(page.getByRole('button', { name: 'Invite Staff Member' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Add Existing User' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Remove' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Edit' })).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test.fail('RES-034: cannot move an application to a decision', async ({ browser, apiAs }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'LimitedApps');
    const volunteer = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'res034-volunteer',
    });
    const ownerApi = await loginAccountViaApi(rescue.owner);
    let applicationId: string;
    try {
      ({ applicationId } = await createAdopterApplication(await apiAs('adopter'), ownerApi));
    } finally {
      await ownerApi.dispose();
    }
    const context = await openAccountContext(browser, volunteer, URLS.rescue);
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);
      await page.goto(`/applications/${applicationId}`);
      // The application has opened: the applicant's answers are on screen.
      await expect(
        page.getByRole('term').filter({ hasText: 'Why do you want to adopt this pet?' })
      ).toBeVisible({ timeout: 30_000 });

      await expect(page.getByRole('button', { name: 'Transition Stage' })).toBeHidden();
    } finally {
      await context.close();
    }
  });
});
