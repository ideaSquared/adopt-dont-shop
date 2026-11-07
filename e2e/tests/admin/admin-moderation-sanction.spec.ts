import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { uniqueText } from '../../helpers/factories';
import { expectOk, postWithCsrf } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * An admin sanctions a reported user from the moderation queue by
 * suspending them, and they can then no longer sign in. Both the
 * reporter and the reported user are freshly registered adopters.
 */
test.describe('applying a sanction from the moderation queue', () => {
  // FIXME: blocked by app bugs found while automating ADM-073.
  //  - Bulk Sanction (the only path that issues an action) reports
  //    "0 succeeded, 1 failed" and the reported user stays active, although a
  //    moderator_actions row is written.
  //  - The single-report "Take Action" modal ignores the chosen action type and
  //    just resolves the report; the stored resolution ("resolved") then fails
  //    the admin list schema and /moderation shows "Error loading reports" for
  //    every admin until that row is fixed.
  // Enable once a sanction really suspends the reported user.
  test.fixme('an admin suspends a reported user from a report and they cannot sign in', async ({
    page,
  }) => {
    const reporter = await createVerifiedAdopter('reporter');
    const target = await createVerifiedAdopter('reported');
    const targetApi = await loginAccountViaApi(target);
    const { userId: targetUserId } = targetApi;
    await targetApi.dispose();

    const reportTitle = uniqueText('E2E spam report');
    const reporterApi = await loginAccountViaApi(reporter);
    try {
      const filed = await postWithCsrf(reporterApi.context, '/api/v1/moderation/reports', {
        reportedEntityType: 'REPORT_ENTITY_TYPE_USER',
        reportedEntityId: targetUserId,
        reportedUserId: targetUserId,
        category: 'REPORT_CATEGORY_SPAM',
        severity: 'SEVERITY_LOW',
        title: reportTitle,
        description: 'E2E: this account posts spam.',
      });
      await expectOk(filed, 'file moderation report');
    } finally {
      await reporterApi.dispose();
    }

    await dismissCookieBannerPatiently(page);
    await page.goto('/moderation');
    await page.getByPlaceholder('Search reports...').fill(reportTitle);
    const reportRow = page.getByRole('row').filter({ hasText: reportTitle });
    await expect(reportRow).toBeVisible({ timeout: 30_000 });
    await reportRow.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Sanction', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Sanction Type/).selectOption('user_suspended');
    await dialog.getByLabel(/^Shared Reason/).fill('E2E: confirmed spam');
    const confirmPhrase = dialog.getByLabel(/^Type CONFIRM/);
    if (await confirmPhrase.isVisible()) {
      await confirmPhrase.fill('CONFIRM');
    }
    await dialog.getByRole('button', { name: 'Apply Sanction' }).click();
    await expect(dialog.getByText(/1 .*succe/i)).toBeVisible({ timeout: 30_000 });

    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      await expect
        .poll(
          async () =>
            (
              await postWithCsrf(anon, '/api/v1/auth/login', {
                email: target.email,
                password: target.password,
              })
            ).ok(),
          { timeout: 30_000 }
        )
        .toBe(false);
    } finally {
      await anon.dispose();
    }
  });
});
