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
): Promise<{ title: string; reportId: string }> => {
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
    const body = (await filed.json()) as { report: { reportId: string } };
    return { title, reportId: body.report.reportId };
  } finally {
    await reporterApi.dispose();
  }
};

const filePetReport = async (
  apiAs: (role: 'rescue') => Promise<ApiClient>,
  label: string
): Promise<{ title: string; reportId: string }> => {
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
  // Bulk dismiss used to store a resolution the list schema rejected, breaking
  // /moderation for every admin (fixed in #1607).
  test('an admin bulk-dismisses a report with a reason and it is marked Dismissed', async ({
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

  // The single-report "Take Action" modal used to store a resolution the list schema
  // rejected, breaking /moderation for every admin (fixed in #1607).
  test('an admin takes action on a report from its Take Action button and the action is recorded', async ({
    page,
    apiAs,
  }) => {
    const { title, reportId } = await filePetReport(apiAs, 'actionreporter');
    const actionReason = 'E2E: a formal warning';

    const row = await findReport(page, title);
    await row.getByRole('button', { name: 'Take Action' }).click();
    // The modal is not a labelled dialog: find it by its form.
    const modal = page.locator('form').filter({ has: page.getByLabel('Action Type *') });
    await modal.getByLabel('Action Type *').selectOption('warning_issued');
    await modal.getByLabel(/^Reason/).fill(actionReason);
    await modal.getByRole('button', { name: 'Take Action' }).click();

    await expect(row.getByText('Resolved', { exact: true })).toBeVisible({ timeout: 15_000 });

    // Resolved is not enough: the chosen action itself must have been recorded
    // against this report (not a dismissal that merely closes it).
    const adminApi = await apiAs('admin');
    const actions = await adminApi.context.get(`/api/v1/moderation/actions?report=${reportId}`);
    await expectOk(actions, 'list moderator actions for the report');
    const { data } = (await actions.json()) as {
      data: { actionType: string; reason: string; reportId?: string }[];
    };
    expect(data).toHaveLength(1);
    expect(data[0]?.actionType).toMatch(/warning/i);
    expect(data[0]?.reason).toBe(actionReason);
  });
});
