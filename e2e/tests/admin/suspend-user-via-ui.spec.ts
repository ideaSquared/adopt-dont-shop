import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { postWithCsrf } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * An admin finds a user on the Users page and suspends them from the detail
 * panel; the suspended user can no longer sign in.
 *
 * user-and-rescue-moderation.spec.ts and bulk-user-actions.spec.ts drive the
 * suspension through the API; this covers the admin's actual path.
 */
test.describe('suspending a user in the admin app', () => {
  test('an admin suspends a user and that user can no longer log in', async ({ page }) => {
    const target = await createVerifiedAdopter('suspend-ui');

    await page.goto('/users');
    await dismissCookieBannerWhenShown(page);
    await page.getByRole('textbox', { name: /search by name or email/i }).fill(target.email);
    const row = page.getByRole('row').filter({ hasText: target.email });
    // Wait for the debounced search to settle (header row + the one match):
    // its refetch re-renders the table and the detail panel.
    await expect(page.getByRole('row')).toHaveCount(2, { timeout: 15_000 });
    await expect(row).toBeVisible();
    await row.getByRole('cell').filter({ hasText: target.email }).click();

    await page.getByRole('tab', { name: 'Actions' }).click();
    await page.getByRole('button', { name: 'Suspend User' }).click();
    const dialog = page.getByRole('dialog', { name: 'Suspend User' });
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('E2E: repeated spam reports');
    await dialog.getByRole('button', { name: 'Suspend User' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await expect(row.getByRole('cell', { name: /suspended/i })).toBeVisible({ timeout: 15_000 });

    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const login = await postWithCsrf(anon, '/api/v1/auth/login', {
        email: target.email,
        password: target.password,
      });
      expect(login.ok()).toBe(false);
    } finally {
      await anon.dispose();
    }
  });
});
