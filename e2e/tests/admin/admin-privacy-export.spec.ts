import { readFile } from 'node:fs/promises';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';

/**
 * An admin exports a user's personal data from the Privacy Tools page and a
 * JSON file is downloaded. The export runs on a freshly registered adopter;
 * the deletion half of the tool is deliberately not exercised.
 */
test.describe('privacy tools data export', () => {
  test('an admin exports a user’s data and a JSON file downloads', async ({ page }) => {
    const target = await createVerifiedAdopter('privacy-export');
    const targetApi = await loginAccountViaApi(target);
    const { userId } = targetApi;
    await targetApi.dispose();
    expect(userId).not.toBe('');

    await dismissCookieBannerPatiently(page);
    await page.goto('/privacy-tools');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Tools' })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('User ID').fill(userId);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export user data' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`data-export-${userId}.json`);
    await expect(page.getByText('Export downloaded.')).toBeVisible();

    const path = await download.path();
    const contents = await readFile(path, 'utf-8');
    expect(contents).toContain(target.email);
  });
});
