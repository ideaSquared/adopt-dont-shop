import type { Browser, BrowserContext, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { loginAccountViaApi } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { uniqueEmail } from '../../helpers/factories';
import { deleteWithCsrf, postWithCsrf, putWithCsrf } from '../../helpers/seeds';
import {
  createRescueWithOwner,
  inviteAndAcceptStaff,
  inviteStaff,
  STAFF_PASSWORD,
  type ThrowawayRescue,
} from '../../helpers/throwaway-rescue';
import { peekInvitationToken } from '../../helpers/token-peek';
import { URLS } from '../../playwright.config';

/**
 * RES-005: an invitee accepts through /accept-invitation and joins with the role they were given.
 * RES-041: a manager invites staff from /staff.
 * RES-042: a manager changes a staff member's role (title) and it takes effect.
 * RES-043: a manager removes a staff member and they lose access to the rescue.
 *
 * Every test runs against a rescue of its own, so the shared Paws Rescue team
 * is never changed. A staff member's "role" is the title the rescue gives them:
 * the rescue app has no other role to assign (every rescue_staff user holds
 * the same permissions).
 */
type Setup = { manager: Page; managerContext: BrowserContext };

const openAsManager = async (browser: Browser, rescue: ThrowawayRescue): Promise<Setup> => {
  const managerContext = await openAccountContext(browser, rescue.owner, URLS.rescue);
  const manager = await managerContext.newPage();
  await dismissCookieBannerWhenShown(manager);
  return { manager, managerContext };
};

// The staff list row that shows this email.
const staffCard = (page: Page, email: string) =>
  page
    .getByRole('list', { name: 'Staff members' })
    .getByRole('listitem')
    .filter({ has: page.getByText(email, { exact: true }) });

const sendInvitation = async (page: Page, email: string, title?: string): Promise<void> => {
  await page.goto('/staff');
  await page.getByRole('button', { name: 'Invite Staff Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite Staff Member' });
  await dialog.getByLabel('Email Address').fill(email);
  if (title) {
    await dialog.getByLabel('Title/Role').fill(title);
  }
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${email}!`)).toBeVisible();
};

test.describe('staff lifecycle', () => {
  // Creating a rescue and its staff accepts invitations, which the gateway rate limits
  // (10 a minute per IP, shared with every other spec); a retry can wait out the window.
  test.describe.configure({ timeout: 180_000 });

  // The accept page reads the invitation since #1606. It only says "invited to join a rescue
  // organization": the details response carries neither the rescue name nor the role, so the
  // page cannot name them (B41).
  test('RES-005: an invitee sets up an account from the invitation link', async ({
    browser,
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'Accept');
    const { email, token } = await inviteStaff(adminApi, rescue.rescueId, {
      title: 'Kennel Coordinator',
      label: 'res005-invitee',
    });

    const context = await browser.newContext({
      baseURL: URLS.rescue,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);
      await page.goto(`/accept-invitation?token=${token}`);

      await expect(page.getByText("You've been invited to join")).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(`You're registering with: ${email}`)).toBeVisible();

      await page.getByLabel('First Name').fill('Kennel');
      await page.getByLabel('Last Name').fill('Coordinator');
      await page.getByLabel('Password', { exact: true }).fill(STAFF_PASSWORD);
      await page.getByLabel('Confirm Password').fill(STAFF_PASSWORD);
      await page.getByRole('button', { name: /accept|create account|join/i }).click();
      await expect(page.getByRole('heading', { name: 'Account Created!' })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('RES-005: an invitee who accepted joins the rescue with the assigned role', async ({
    browser,
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'Joined');
    const invitee = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Kennel Coordinator',
      label: 'res005-joined',
    });

    const context = await browser.newContext({
      baseURL: URLS.rescue,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);

      await loginViaUI(page, invitee.email, invitee.password);
      await expect(
        page.getByRole('heading', { name: 'Rescue Dashboard', exact: true })
      ).toBeVisible({ timeout: 30_000 });

      // They are staff of that rescue, with the title the invitation gave them.
      await page.goto('/staff');
      const card = staffCard(page, invitee.email);
      await expect(card).toBeVisible({ timeout: 30_000 });
      await expect(card.getByText('Kennel Coordinator')).toBeVisible();
      await expect(
        page.getByRole('main').getByText(rescue.owner.email, { exact: true })
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('RES-041: a manager invites staff and the invitation is sent', async ({
    browser,
    apiAs,
  }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'Invite');
    const { manager, managerContext } = await openAsManager(browser, rescue);
    const inviteeEmail = uniqueEmail('res041-invitee');
    try {
      await sendInvitation(manager, inviteeEmail, 'Volunteer');

      // The invitation exists for that rescue (its emailed token is on file).
      expect(await peekInvitationToken(inviteeEmail, rescue.rescueId)).toBeTruthy();
    } finally {
      await managerContext.close();
    }
  });

  // App bug: a rescue manager gets 403 listing their own rescue's invitations
  // (GET /api/v1/rescues/:id/invitations), so the "Pending Invitations" section
  // never appears. Remove test.fail once managers can read their invitations.
  test.fail('RES-041: a sent invitation is listed as pending', async ({ browser, apiAs }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'InvitePending');
    const { manager, managerContext } = await openAsManager(browser, rescue);
    const inviteeEmail = uniqueEmail('res041-pending');
    try {
      await sendInvitation(manager, inviteeEmail);

      await expect(manager.getByRole('heading', { name: 'Pending Invitations' })).toBeVisible();
      await expect(manager.getByText(inviteeEmail)).toBeVisible();
    } finally {
      await managerContext.close();
    }
  });

  // App bug: the Edit Staff Member form checks the user id against a legacy
  // `user_0000xxxxxxxx` pattern, which no real (UUID) id matches, so saving is
  // always refused with "Please enter a valid user ID" and no title can be
  // changed from the page. Remove test.fail once the form accepts real ids.
  test.fail(
    "RES-042: a manager changes a staff member's role from the staff page",
    async ({ browser, apiAs }) => {
      const adminApi = await apiAs('admin');
      const rescue = await createRescueWithOwner(adminApi, 'Retitle');
      const staff = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
        title: 'Volunteer',
        label: 'res042-staff',
      });
      const { manager, managerContext } = await openAsManager(browser, rescue);
      try {
        await manager.goto('/staff');
        const card = staffCard(manager, staff.email);
        await expect(card.getByText('Volunteer')).toBeVisible({ timeout: 30_000 });

        await card.getByRole('button', { name: 'Edit' }).click();
        await manager.getByLabel('Title', { exact: true }).fill('Adoption Coordinator');
        await manager.getByRole('button', { name: 'Update Staff Member' }).click();
        await expect(manager.getByText('Staff member updated successfully!')).toBeVisible();
        await expect(card.getByText('Adoption Coordinator')).toBeVisible();
      } finally {
        await managerContext.close();
      }
    }
  );

  test("RES-042: a role the manager sets through the API is the staff member's role", async ({
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'RetitleApi');
    const staff = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'res042-api',
    });
    const managerApi = await loginAccountViaApi(rescue.owner);
    const staffApi = await loginAccountViaApi(staff);
    try {
      const before = (await (await staffApi.context.get('/api/v1/staff/me')).json()) as {
        data: { title: string; userId: string };
      };
      expect(before.data.title).toBe('Volunteer');

      const changed = await putWithCsrf(
        managerApi.context,
        `/api/v1/rescues/${rescue.rescueId}/staff/${before.data.userId}`,
        { title: 'Adoption Coordinator' }
      );
      expect(changed.status()).toBe(200);

      const after = (await (await staffApi.context.get('/api/v1/staff/me')).json()) as {
        data: { title: string; rescueId: string };
      };
      expect(after.data).toMatchObject({
        title: 'Adoption Coordinator',
        rescueId: rescue.rescueId,
      });
    } finally {
      await managerApi.dispose();
      await staffApi.dispose();
    }
  });

  test('RES-043: a manager removes a staff member and they are no longer staff of the rescue', async ({
    browser,
    apiAs,
  }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'Remove');
    const staff = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'res043-staff',
    });
    const staffApi = await loginAccountViaApi(staff);
    const { manager, managerContext } = await openAsManager(browser, rescue);
    try {
      expect((await staffApi.context.get('/api/v1/staff/me')).status()).toBe(200);

      await manager.goto('/staff');
      const card = staffCard(manager, staff.email);
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.getByRole('button', { name: 'Remove' }).click();
      await manager.getByRole('button', { name: 'Remove', exact: true }).last().click();
      await expect(manager.getByText('Staff member removed successfully!')).toBeVisible();
      await expect(card).toBeHidden();

      // Gone for good: a reload does not bring them back, and they are no longer staff.
      await manager.reload();
      // In the main area: the dev login panel also prints the signed-in user's email.
      await expect(
        manager.getByRole('main').getByText(rescue.owner.email, { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await expect(manager.getByText(staff.email, { exact: true })).toBeHidden();
      expect((await staffApi.context.get('/api/v1/staff/me')).status()).toBe(404);
    } finally {
      await managerContext.close();
      await staffApi.dispose();
    }
  });

  // A removed member is refused since #1605.
  test('RES-043: a removed staff member can no longer act for the rescue', async ({ apiAs }) => {
    const adminApi = await apiAs('admin');
    const rescue = await createRescueWithOwner(adminApi, 'RemoveAccess');
    const staff = await inviteAndAcceptStaff(adminApi, rescue.rescueId, {
      title: 'Volunteer',
      label: 'res043-access',
    });
    const managerApi = await loginAccountViaApi(rescue.owner);
    const staffApi = await loginAccountViaApi(staff);
    const addPet = () =>
      postWithCsrf(staffApi.context, '/api/v1/pets', {
        name: 'Access check',
        type: 'dog',
        gender: 'female',
        size: 'medium',
        ageGroup: 'adult',
        rescueId: rescue.rescueId,
      });
    try {
      // While they are staff they can act for the rescue.
      expect((await addPet()).status()).toBe(201);

      const me = (await (await staffApi.context.get('/api/v1/staff/me')).json()) as {
        data: { userId: string };
      };
      const removed = await deleteWithCsrf(
        managerApi.context,
        `/api/v1/rescues/${rescue.rescueId}/staff/${me.data.userId}`
      );
      expect(removed.status()).toBe(200);

      expect((await addPet()).status()).toBe(403);
    } finally {
      await managerApi.dispose();
      await staffApi.dispose();
    }
  });
});
