import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { openAccountContext, openRoleContext } from '../../helpers/cross-app-sessions';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet, expectOk, patchWithCsrf, postWithCsrf } from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { URLS } from '../../playwright.config';
import { chooseSelectOption } from '../../helpers/radix-select';
import { auditRowsForUser } from '../../helpers/audit';

const SUSPEND_REASON = 'E2E: confirmed abuse';

async function loginStatus(email: string, password: string): Promise<number> {
  const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    return (await postWithCsrf(anon, '/api/v1/auth/login', { email, password })).status();
  } finally {
    await anon.dispose();
  }
}

/**
 * X-003: a pet is reported, the report reaches the admin's moderation queue,
 * and the admin suspends an account from the Users page. The client has no
 * "report this pet" control, so the adopter's report is filed through the same
 * API call the app would make.
 */
test.describe('X-003 report and moderate', () => {
  test('a reported pet shows in the admin queue and the admin suspends a user', async ({
    browser,
    apiAs,
  }) => {
    test.setTimeout(120_000);

    const pet = await createAvailablePet(await apiAs('rescue'), 'X003');
    const reporter = await createVerifiedAdopter('x003-reporter');
    const target = await createVerifiedAdopter('x003-target');
    const reportTitle = uniqueText('E2E pet report');

    // 1) The adopter reports the pet.
    const reporterApi = await loginAccountViaApi(reporter);
    try {
      const filed = await postWithCsrf(reporterApi.context, '/api/v1/moderation/reports', {
        reportedEntityType: 'REPORT_ENTITY_TYPE_PET',
        reportedEntityId: pet.petId,
        category: 'REPORT_CATEGORY_ANIMAL_WELFARE',
        severity: 'SEVERITY_LOW',
        title: reportTitle,
        description: 'E2E: this listing looks wrong.',
      });
      await expectOk(filed, 'file pet report');
    } finally {
      await reporterApi.dispose();
    }

    const adminContext = await openRoleContext(browser, 'admin');
    try {
      const admin = await adminContext.newPage();
      await dismissCookieBannerPatiently(admin);

      // 2) Admin: the report is waiting in the moderation queue.
      await admin.goto('/moderation');
      await admin.getByPlaceholder('Search reports...').fill(reportTitle);
      await expect(admin.getByRole('row').filter({ hasText: reportTitle })).toBeVisible({
        timeout: 30_000,
      });

      // 3) Admin: suspend an account from the Users page.
      await admin.goto('/users');
      await admin.getByRole('searchbox', { name: 'Search', exact: true }).fill(target.email);
      await expect(admin.getByRole('row')).toHaveCount(2, { timeout: 15_000 });
      const row = admin.getByRole('row').filter({ hasText: target.email });
      await row.getByRole('cell').filter({ hasText: target.email }).click();
      await admin.getByRole('tab', { name: 'Actions' }).click();
      await admin.getByRole('button', { name: 'Suspend User' }).click();
      const dialog = admin.getByRole('dialog', { name: 'Suspend User' });
      await dialog.getByRole('textbox', { name: 'Reason' }).fill(SUSPEND_REASON);
      await dialog.getByRole('button', { name: 'Suspend User' }).click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });
      await expect(row.getByRole('cell', { name: /suspended/i })).toBeVisible({ timeout: 15_000 });
    } finally {
      await adminContext.close();
    }

    expect(await loginStatus(target.email, target.password)).not.toBe(200);
  });

  // The "Take Action" modal used to store a resolution that broke /moderation for
  // every admin (fixed in #1607).
  test('an admin resolves the pet report from the queue and the report leaves it', async ({
    browser,
    apiAs,
  }) => {
    const pet = await createAvailablePet(await apiAs('rescue'), 'X003Resolve');
    const reporter = await createVerifiedAdopter('x003-resolver');
    const reportTitle = uniqueText('E2E pet report to resolve');
    const reporterApi = await loginAccountViaApi(reporter);
    try {
      const filed = await postWithCsrf(reporterApi.context, '/api/v1/moderation/reports', {
        reportedEntityType: 'REPORT_ENTITY_TYPE_PET',
        reportedEntityId: pet.petId,
        category: 'REPORT_CATEGORY_ANIMAL_WELFARE',
        severity: 'SEVERITY_LOW',
        title: reportTitle,
        description: 'E2E: this listing looks wrong.',
      });
      await expectOk(filed, 'file pet report');
    } finally {
      await reporterApi.dispose();
    }

    const adminContext = await openRoleContext(browser, 'admin');
    try {
      const admin = await adminContext.newPage();
      await dismissCookieBannerPatiently(admin);
      await admin.goto('/moderation');
      await admin.getByPlaceholder('Search reports...').fill(reportTitle);
      const row = admin.getByRole('row').filter({ hasText: reportTitle });
      await row.getByRole('button', { name: 'Take Action' }).click();
      const modal = admin.getByRole('dialog', { name: 'Take Moderation Action' });
      await chooseSelectOption(admin, modal.getByLabel('Action Type'), 'Issue Warning');
      await modal.getByLabel(/^Reason/).fill('E2E: a formal warning');
      await modal.getByRole('button', { name: 'Take Action' }).click();
      await expect(admin.getByText(/error loading reports/i)).toHaveCount(0);
      await expect(row.getByText(/resolved/i)).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });

  // An admin suspension leaves an audit entry (fixed in #1604).
  test('the admin suspension appears on the /audit page', async ({ browser, apiAs }) => {
    const target = await createVerifiedAdopter('x003-audit');
    const targetApi = await loginAccountViaApi(target);
    const { userId } = targetApi;
    await targetApi.dispose();
    const suspended = await patchWithCsrf(
      (await apiAs('admin')).context,
      `/api/v1/admin/users/${userId}/action`,
      { action: 'suspend', reason: SUSPEND_REASON }
    );
    await expectOk(suspended, 'suspend user');

    const adminContext = await openRoleContext(browser, 'admin');
    try {
      const admin = await adminContext.newPage();
      await dismissCookieBannerPatiently(admin);
      await admin.goto('/audit');

      // The page is loaded and lists this user's own sign-in...
      const entries = auditRowsForUser(admin, userId);
      await expect(entries.filter({ hasText: /login/i })).toBeVisible({ timeout: 30_000 });
      // ...and also an entry for the suspension itself.
      await expect(entries.filter({ hasNotText: /login/i })).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});

/**
 * X-004: a user who is signed in when an admin suspends them is locked out on
 * their next navigation, and cannot sign back in.
 */
test.describe('X-004 suspended user is locked out', () => {
  test("a suspended user's open session ends and they cannot sign in again", async ({
    browser,
    apiAs,
  }) => {
    const account = await createVerifiedAdopter('x004');
    const userContext = await openAccountContext(browser, account, URLS.client);
    try {
      const page = await userContext.newPage();
      await skipSwipeIntro(page);
      await dismissCookieBannerPatiently(page);

      await page.goto('/profile');
      await expect(page.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
        timeout: 15_000,
      });
      const userMenu = page.getByRole('button', { name: /user menu for E2E Adopter/i });
      await expect(userMenu).toBeVisible();

      // Admin: suspend the account while the adopter's browser is still open.
      const adminApi = await apiAs('admin');
      const found = await adminApi.context.get('/api/v1/admin/users', {
        params: { search: account.email, limit: '10' },
      });
      await expectOk(found, 'find user');
      const { data: users } = (await found.json()) as {
        data: Array<{ userId: string; email: string }>;
      };
      const userId = users.find(u => u.email === account.email)?.userId;
      expect(userId, 'the adopter is listed for the admin').toBeTruthy();
      const suspended = await patchWithCsrf(
        adminApi.context,
        `/api/v1/admin/users/${userId}/action`,
        { action: 'suspend', reason: SUSPEND_REASON }
      );
      await expectOk(suspended, 'suspend user');

      // Next navigation: the existing session no longer works.
      await page.goto('/applications');
      await expect(page.getByRole('button', { name: /user menu for E2E Adopter/i })).toHaveCount(0);
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: /my profile/i })).toHaveCount(0);

      // The same credentials are now refused on the login form.
      await page.getByLabel(/email/i).first().fill(account.email);
      await page
        .getByLabel(/password/i)
        .first()
        .fill(account.password);
      await page
        .getByRole('button', { name: /^(sign in|log ?in)$/i })
        .first()
        .click();
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await userContext.close();
    }
  });
});
