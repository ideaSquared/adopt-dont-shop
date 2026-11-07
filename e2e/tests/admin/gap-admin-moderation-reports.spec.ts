import type { Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet, expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Reports raised by adopters reach the admin moderation queue (ADM-071) and an
 * admin can close them out (ADM-072).
 *
 * The client app has no "report" control today, so the adopter files the report
 * through the same gateway endpoint a client UI would call.
 */

const REPORT_DESCRIPTION = 'E2E: this listing contains misleading photos and text.';

const fileReportAsAdopter = async (
  label: string,
  report: Record<string, string>
): Promise<{ title: string }> => {
  const reporter = await createVerifiedAdopter(label);
  const reporterApi = await loginAccountViaApi(reporter);
  try {
    const title = uniqueText('E2E report');
    const filed = await postWithCsrf(reporterApi.context, '/api/v1/moderation/reports', {
      category: 'REPORT_CATEGORY_INAPPROPRIATE_CONTENT',
      severity: 'SEVERITY_LOW',
      title,
      description: REPORT_DESCRIPTION,
      ...report,
    });
    await expectOk(filed, 'file moderation report');
    return { title };
  } finally {
    await reporterApi.dispose();
  }
};

const filePetReport = async (
  apiAs: (role: 'rescue') => Promise<ApiClient>,
  label: string
): Promise<{ title: string }> => {
  const pet = await createAvailablePet(await apiAs('rescue'), 'Reported');
  return fileReportAsAdopter(label, {
    reportedEntityType: 'REPORT_ENTITY_TYPE_PET',
    reportedEntityId: pet.petId,
  });
};

const findReport = async (page: Page, title: string) => {
  await dismissCookieBannerPatiently(page);
  await page.goto('/moderation');
  await page.getByPlaceholder('Search reports...').fill(title);
  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  return row;
};

test.describe('reports reaching the moderation queue (ADM-071)', () => {
  test('a report an adopter files about a pet shows up pending in /moderation', async ({
    page,
    apiAs,
  }) => {
    const { title } = await filePetReport(apiAs, 'petreporter');

    const row = await findReport(page, title);
    await expect(row.getByText('Pending Review')).toBeVisible();
    await expect(row.getByText('Low', { exact: true })).toBeVisible();
    await expect(row.getByText('pet', { exact: true })).toBeVisible();

    await row.getByRole('button', { name: 'View Details' }).click();
    const inspector = page.getByTestId('report-detail-inspector');
    await expect(inspector.getByText(REPORT_DESCRIPTION)).toBeVisible();
  });
});

test.describe('closing out a report (ADM-072)', () => {
  // BUG: bulk dismiss stores resolution='dismissed', which is not in the moderation
  // list schema (no_action | warning_issued | content_removed | user_suspended |
  // user_banned | escalated), so /moderation then shows "Error loading reports" for
  // every admin until the row is repaired in the database. Its response
  // ({ data: [...] }) also does not match lib.moderation's { success, updated }, so the
  // dialog never shows its result. Not driven on the shared stack.
  test.fixme('an admin bulk-dismisses a report with a reason and it is marked Dismissed', async ({
    page,
    apiAs,
  }) => {
    const { title } = await filePetReport(apiAs, 'dismissreporter');

    const row = await findReport(page, title);
    await row.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Bulk Dismiss Reports' });
    await expect(dialog.getByTestId('bulk-selected-count')).toHaveText('1 report selected');
    await dialog.getByLabel(/^Shared Reason/).fill('E2E: the listing is accurate');
    await dialog.getByRole('button', { name: 'Dismiss Reports' }).click();
    await expect(dialog.getByTestId('bulk-result')).toHaveText('1 succeeded', { timeout: 30_000 });
    await dialog.getByRole('button', { name: 'Close' }).click();

    await expect(row.getByText('Dismissed', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole('button', { name: 'Take Action' })).toHaveCount(0);

    await page.reload();
    await page.getByLabel('Status', { exact: true }).selectOption('dismissed');
    await page.getByPlaceholder('Search reports...').fill(title);
    await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(1, {
      timeout: 30_000,
    });
  });

  // BUG: the single-report "Take Action" modal drops the chosen action and
  // stores resolution='resolved', which then fails the moderation list schema
  // and breaks /moderation for every admin. Not driven on the shared stack.
  test.fixme('an admin takes action on a report from its Take Action button and the action is recorded', async ({
    page,
    apiAs,
  }) => {
    const { title } = await filePetReport(apiAs, 'actionreporter');

    const row = await findReport(page, title);
    await row.getByRole('button', { name: 'Take Action' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /take action|submit/i })
      .click();

    await expect(row.getByText('Resolved', { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
