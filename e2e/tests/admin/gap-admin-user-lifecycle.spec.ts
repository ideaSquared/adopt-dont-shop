import type { Browser, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, type Account } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { patchWithCsrf } from '../../helpers/seeds';
import { ROLES } from '../../fixtures/roles';
import { URLS } from '../../playwright.config';

/**
 * User lifecycle driven from the admin Users page: reactivating a suspended
 * user (ADM-023) and the audit trail of a suspension (ADM-150).
 */

type AdminApi = Awaited<ReturnType<Parameters<Parameters<typeof test>[2]>[0]['apiAs']>>;

const findUserId = async (adminApi: AdminApi, email: string): Promise<string> => {
  const res = await adminApi.context.get('/api/v1/admin/users', {
    params: { search: email, limit: '10' },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data?: Array<{ userId: string; email: string }> };
  const match = (body.data ?? []).find(u => u.email === email);
  expect(match, `${email} not found in admin user search`).toBeTruthy();
  return match!.userId;
};

const openUserActions = async (page: Page, account: Account): Promise<void> => {
  await page.goto('/users');
  await dismissCookieBannerPatiently(page);
  await page.getByRole('textbox', { name: /search by name or email/i }).fill(account.email);
  // Header row + the one match: the debounced search has settled.
  await expect(page.getByRole('row')).toHaveCount(2, { timeout: 15_000 });
  await page
    .getByRole('row')
    .filter({ hasText: account.email })
    .getByRole('cell')
    .filter({ hasText: account.email })
    .click();
  await page.getByRole('tab', { name: 'Actions' }).click();
};

const signInOnClient = async (browser: Browser, account: Account): Promise<void> => {
  const clientContext = await browser.newContext({
    baseURL: URLS.client,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const client = await clientContext.newPage();
    await dismissCookieBannerPatiently(client);
    await loginViaUI(client, account.email, account.password);
    await expect(client).not.toHaveURL(/\/login/);
    await expect(client.getByRole('alert')).toHaveCount(0);
  } finally {
    await clientContext.close();
  }
};

const createSuspendedUser = async (adminApi: AdminApi, label: string): Promise<Account> => {
  const account = await createVerifiedAdopter(label);
  const userId = await findUserId(adminApi, account.email);
  const suspended = await patchWithCsrf(adminApi.context, `/api/v1/admin/users/${userId}/action`, {
    action: 'suspend',
    reason: 'E2E: setup for reactivation',
  });
  expect(suspended.ok()).toBe(true);
  return account;
};

test.describe('reactivating a suspended user (ADM-023)', () => {
  // BUG: the Users page "Unsuspend User" button PATCHes
  // /admin/users/:id/action with { action: 'unsuspend' } (apps/admin
  // userManagementService.unsuspendUser) but the gateway only accepts
  // 'suspend' | 'reactivate', so it answers 400 and the user stays suspended.
  test.fail(
    'an admin unsuspends a user in the UI and the user can sign in again',
    async ({ page, apiAs, browser }) => {
      const account = await createSuspendedUser(await apiAs('admin'), 'reactivate-ui');

      await openUserActions(page, account);
      const row = page.getByRole('row').filter({ hasText: account.email });
      await expect(row.getByRole('cell', { name: /suspended/i })).toBeVisible();
      await page.getByRole('button', { name: 'Unsuspend User' }).click();

      await expect(page.getByText('User unsuspended successfully')).toBeVisible({
        timeout: 15_000,
      });
      await expect(row.getByRole('cell', { name: /active/i })).toBeVisible({ timeout: 15_000 });
      await signInOnClient(browser, account);
    }
  );

  test('a user reactivated through the moderation endpoint can sign in on the client again', async ({
    page,
    apiAs,
    browser,
  }) => {
    const adminApi = await apiAs('admin');
    const account = await createSuspendedUser(adminApi, 'reactivate-api');
    const userId = await findUserId(adminApi, account.email);

    const reactivated = await patchWithCsrf(
      adminApi.context,
      `/api/v1/admin/users/${userId}/action`,
      { action: 'reactivate', reason: 'E2E: appeal upheld' }
    );
    expect(reactivated.ok()).toBe(true);

    await openUserActions(page, account);
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: account.email })
        .getByRole('cell', { name: /active/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suspend User' })).toBeVisible();
    await signInOnClient(browser, account);
  });
});

test.describe('audit trail of a suspension (ADM-150)', () => {
  // BUG: suspending or reactivating a user (PATCH /admin/users/:id/action ->
  // auth deactivateUser/reactivateUser) publishes `auth.userDeactivated` /
  // `auth.userReactivated`, not `<domain>.actionTaken`, so service.audit's
  // `*.actionTaken` subscriber never persists it and /audit has no entry.
  test.fail('the suspension appears in /audit with who, what and when', async ({ page, apiAs }) => {
    const adminApi = await apiAs('admin');
    const account = await createVerifiedAdopter('audit');
    const userId = await findUserId(adminApi, account.email);

    await openUserActions(page, account);
    await page.getByRole('button', { name: 'Suspend User' }).click();
    const dialog = page.getByRole('dialog', { name: 'Suspend User' });
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('E2E: audit trail check');
    await dialog.getByRole('button', { name: 'Suspend User' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await page.goto('/audit');
    await page.getByRole('combobox').filter({ hasText: 'All Resources' }).click();
    await page.getByRole('option', { name: 'User', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(ROLES.admin.email);

    const entry = page.getByRole('row').filter({ hasText: `ID: ${userId}` });
    await expect(entry).toHaveCount(1, { timeout: 15_000 });
    await expect(entry).toContainText(ROLES.admin.email);
    await expect(entry).toContainText(/suspend/i);
    await expect(entry).toContainText(/\dm ago|\d+h ago/);
  });
});
