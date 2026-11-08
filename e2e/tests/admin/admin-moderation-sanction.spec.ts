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
  // Bulk Sanction used to report "0 succeeded, 1 failed" and leave the user active;
  // the moderation sanction RPC (#1607) fixed that.
  test('an admin suspends a reported user from a report and they cannot sign in', async ({
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
            ).status(),
          { timeout: 30_000 }
        )
        // A suspended account is refused with PERMISSION_DENIED (403); a 429 or
        // 5xx must not be mistaken for the sanction taking effect.
        .toBe(403);
    } finally {
      await anon.dispose();
    }
  });
});
