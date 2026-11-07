import type { Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet, expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * The moderation queue lists reports adopters have filed and narrows them by
 * search, severity, content type and status. Two reports with a shared search
 * token (one low-severity pet report, one high-severity user report) make each
 * filter's effect visible.
 */

type ApiAs = (role: 'rescue') => Promise<ApiClient>;

const fileReport = async (
  reporterApi: Awaited<ReturnType<typeof loginAccountViaApi>>,
  report: Record<string, string>
): Promise<void> => {
  const filed = await postWithCsrf(reporterApi.context, '/api/v1/moderation/reports', {
    category: 'REPORT_CATEGORY_INAPPROPRIATE_CONTENT',
    description: 'E2E: queue filter check for this report.',
    ...report,
  });
  await expectOk(filed, 'file moderation report');
};

const FILTER_QUERY_PARAM: Record<string, string> = {
  Severity: 'severity',
  Status: 'status',
  'Content Type': 'reportedEntityType',
};

const filterBy = async (page: Page, label: string, option: string): Promise<void> => {
  // Wait for the refetch that carries this filter (or drops it, for "all") so
  // assertions never see the list mid-swap.
  const param = FILTER_QUERY_PARAM[label];
  const expected = option === 'all' ? `${param}=` : `${param}=${option}`;
  await Promise.all([
    page.waitForResponse(res => {
      const url = res.url();
      return (
        url.includes('/admin/moderation/reports?') &&
        (option === 'all' ? !url.includes(expected) : url.includes(expected))
      );
    }),
    page.getByLabel(label, { exact: true }).selectOption(option),
  ]);
};

type SeededQueue = { lowTitle: string; highTitle: string; token: string };

const seedQueue = async (apiAs: ApiAs): Promise<SeededQueue> => {
  const token = uniqueText('queue');
  const lowTitle = `${token} listing photos`;
  const highTitle = `${token} abusive user`;
  const pet = await createAvailablePet(await apiAs('rescue'), 'Queue');
  const reporter = await createVerifiedAdopter('queue-reporter');
  const target = await createVerifiedAdopter('queue-target');
  const reporterApi = await loginAccountViaApi(reporter);
  const targetApi = await loginAccountViaApi(target);
  try {
    await fileReport(reporterApi, {
      reportedEntityType: 'REPORT_ENTITY_TYPE_PET',
      reportedEntityId: pet.petId,
      severity: 'SEVERITY_LOW',
      title: lowTitle,
    });
    await fileReport(reporterApi, {
      reportedEntityType: 'REPORT_ENTITY_TYPE_USER',
      reportedEntityId: targetApi.userId,
      reportedUserId: targetApi.userId,
      severity: 'SEVERITY_HIGH',
      title: highTitle,
    });
  } finally {
    await reporterApi.dispose();
    await targetApi.dispose();
  }
  return { lowTitle, highTitle, token };
};

const searchQueue = async (page: Page, token: string): Promise<void> => {
  await dismissCookieBannerPatiently(page);
  await page.goto('/moderation');
  await expect(page.getByRole('heading', { level: 1, name: 'Content Moderation' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByPlaceholder('Search reports...').fill(token);
};

test.describe('moderation queue', () => {
  test('reports can be found and narrowed by severity and status', async ({ page, apiAs }) => {
    const { lowTitle, highTitle, token } = await seedQueue(apiAs);

    await searchQueue(page, token);
    const lowRow = page.getByRole('row').filter({ hasText: lowTitle });
    const highRow = page.getByRole('row').filter({ hasText: highTitle });
    await expect(lowRow).toHaveCount(1, { timeout: 30_000 });
    await expect(highRow).toHaveCount(1);
    await expect(lowRow.getByText('Low', { exact: true })).toBeVisible();
    await expect(highRow.getByText('High', { exact: true })).toBeVisible();

    await filterBy(page, 'Severity', 'high');
    await expect(highRow).toHaveCount(1, { timeout: 15_000 });
    await expect(lowRow).toHaveCount(0, { timeout: 15_000 });

    await filterBy(page, 'Severity', 'all');
    await filterBy(page, 'Status', 'dismissed');
    await expect(lowRow).toHaveCount(0, { timeout: 15_000 });
    await expect(highRow).toHaveCount(0);
  });

  // BUG: the "Search reports..." box is passed to GET /admin/moderation/reports as
  // `search`, which the route does not read, so the list is never narrowed.
  test.fail('searching the queue lists only the matching reports', async ({ page, apiAs }) => {
    const { token } = await seedQueue(apiAs);

    await searchQueue(page, token);
    // Header row + the two reports that carry the token.
    await expect(page.getByRole('row')).toHaveCount(3, { timeout: 30_000 });
  });

  // BUG: the Content Type filter is sent as `reportedEntityType`, but GET
  // /admin/moderation/reports does not read it, so the list is normally not narrowed
  // (it only appears to work when the other report happens to fall off page 1).
  // Fixme rather than fail: the outcome is not deterministic on a shared stack.
  test.fixme('the Content Type filter narrows the queue to that kind of report', async ({
    page,
    apiAs,
  }) => {
    const { lowTitle, highTitle, token } = await seedQueue(apiAs);

    await searchQueue(page, token);
    const lowRow = page.getByRole('row').filter({ hasText: lowTitle });
    const highRow = page.getByRole('row').filter({ hasText: highTitle });
    await expect(lowRow).toHaveCount(1, { timeout: 30_000 });
    await expect(highRow).toHaveCount(1);

    await filterBy(page, 'Content Type', 'pet');
    await expect(lowRow).toHaveCount(1, { timeout: 15_000 });
    await expect(highRow).toHaveCount(0, { timeout: 15_000 });
  });
});
