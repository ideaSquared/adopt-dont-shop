import { request as playwrightRequest, type Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { fetchCsrfToken } from '../../helpers/csrf';
import { URLS } from '../../playwright.config';

/**
 * The audit log lists who did what and when. Rows are created by signing a
 * throwaway adopter in (and failing once), then found again in /audit by the
 * filters an admin would use.
 */

const chooseFilter = async (page: Page, current: string, option: string): Promise<void> => {
  await page.getByRole('combobox').filter({ hasText: current }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

const searchAuditBy = async (page: Page, text: string): Promise<void> => {
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(text);
};

const failOneSignIn = async (email: string): Promise<void> => {
  const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const res = await anon.post('/api/v1/auth/login', {
      data: { email, password: 'definitely-the-wrong-password-1A!' },
      headers: { 'x-csrf-token': await fetchCsrfToken(anon) },
    });
    expect(res.status()).toBe(401);
  } finally {
    await anon.dispose();
  }
};

test.describe('admin audit log', () => {
  test('a sign-in is listed with who, what, when and can be found with the filters', async ({
    page,
  }) => {
    const account = await createVerifiedAdopter('audit-login');
    const adopterApi = await loginAccountViaApi(account);
    const { userId } = adopterApi;
    await adopterApi.dispose();

    await dismissCookieBannerPatiently(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit Logs' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/last 7 days/i)).toBeVisible();

    await chooseFilter(page, 'All Actions', 'Login');
    await chooseFilter(page, 'All Resources', 'User');
    await searchAuditBy(page, account.email);

    const entry = page.getByRole('row').filter({ hasText: `ID: ${userId}` });
    await expect(entry).toHaveCount(1, { timeout: 15_000 });
    await expect(entry).toContainText('login User');
    await expect(entry).toContainText(account.email);
    await expect(entry.getByRole('cell', { name: 'Success', exact: true })).toBeVisible();
    await expect(entry.getByRole('cell', { name: /^\d+m ago$/ })).toBeVisible();

    // Narrowing by a different action removes it again.
    await chooseFilter(page, 'Login', 'Logout');
    await expect(page.getByRole('row').filter({ hasText: `ID: ${userId}` })).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('a failed sign-in is listed as Failed and its details name the user', async ({ page }) => {
    const account = await createVerifiedAdopter('audit-failed');
    await failOneSignIn(account.email);

    await dismissCookieBannerPatiently(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit Logs' })).toBeVisible({
      timeout: 30_000,
    });
    await chooseFilter(page, 'All Actions', 'Login');
    await searchAuditBy(page, account.email);

    const entry = page.getByRole('row').filter({ hasText: account.email });
    await expect(entry).toHaveCount(1, { timeout: 15_000 });
    await expect(entry.getByRole('cell', { name: 'Failed', exact: true })).toBeVisible();

    await entry.click();
    await expect(page.getByText('Audit Log Details')).toBeVisible();
    await expect(page.locator('pre')).toContainText(`"email": "${account.email}"`);
    await expect(page.locator('pre')).toContainText('"status": "failure"');
  });

  // BUG: failed sign-ins are stored with outcome DENIED and shown as "Failed",
  // but the gateway's status=failure filter matches outcome FAILURE only
  // (services/gateway/src/routes/audit.ts), so choosing the "Failed" status
  // filter hides them.
  test.fail('the Failed status filter lists a failed sign-in', async ({ page }) => {
    const account = await createVerifiedAdopter('audit-failed-filter');
    await failOneSignIn(account.email);

    await dismissCookieBannerPatiently(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit Logs' })).toBeVisible({
      timeout: 30_000,
    });
    const failedList = page.waitForResponse(
      res => res.url().includes('/admin/audit-logs') && res.url().includes('status=failure')
    );
    await chooseFilter(page, 'All Statuses', 'Failed');
    await failedList;
    await searchAuditBy(page, account.email);

    await expect(page.getByRole('row').filter({ hasText: account.email })).toHaveCount(1, {
      timeout: 15_000,
    });
  });
});
