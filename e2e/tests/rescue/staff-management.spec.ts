import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { createRescueWithOwner, inviteAndAcceptStaff } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

/**
 * The staff page lists the rescue's team with each member's name, role and
 * email. It runs on a rescue of its own whose team the test knows exactly: a
 * manager and one volunteer.
 */
test.describe('rescue staff management', () => {
  // Creating a rescue and its staff accepts invitations, which the gateway rate limits
  // (10 a minute per IP, shared with every other spec); a retry can wait out the window.
  test.describe.configure({ timeout: 180_000 });

  test('the team is listed with names, roles and emails, and others can be edited or removed', async ({
    browser,
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'Team');
    const volunteer = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Kennel Volunteer',
      label: 'team-volunteer',
      firstName: 'Vera',
    });
    const context = await openAccountContext(browser, rescue.owner, URLS.rescue);
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);
      await page.goto('/staff');

      await expect(page.getByRole('heading', { name: 'Staff', exact: true })).toBeVisible({
        timeout: 30_000,
      });
      const rows = page.getByRole('list', { name: 'Staff members' }).getByRole('listitem');
      await expect(rows).toHaveCount(2, { timeout: 30_000 });

      // Each member: name, role (title) and email on one row.
      const managerCard = rows.filter({ has: page.getByText(rescue.owner.email, { exact: true }) });
      await expect(managerCard.getByRole('heading', { name: 'Rae E2E' })).toBeVisible();
      await expect(managerCard.getByText('Manager', { exact: true })).toBeVisible();

      const volunteerCard = rows.filter({ has: page.getByText(volunteer.email, { exact: true }) });
      await expect(volunteerCard.getByRole('heading', { name: 'Vera E2E' })).toBeVisible();
      await expect(volunteerCard.getByText('Kennel Volunteer', { exact: true })).toBeVisible();

      // A manager can edit or remove others, but not themselves.
      await expect(volunteerCard.getByRole('button', { name: 'Edit' })).toBeVisible();
      await expect(volunteerCard.getByRole('button', { name: 'Remove' })).toBeVisible();
      await expect(managerCard.getByRole('button', { name: 'Edit' })).toBeHidden();
      await expect(managerCard.getByRole('button', { name: 'Remove' })).toBeHidden();
    } finally {
      await context.close();
    }
  });
});
