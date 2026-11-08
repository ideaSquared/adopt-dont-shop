import { test, expect } from '../../fixtures';

/**
 * RES-101: an anonymous visit to the rescue app asks for cookie consent, and
 * the choice is remembered. These tests deliberately do NOT use
 * dismissCookieBannerWhenShown — the banner is the thing under test.
 */
test.describe('cookie consent on the rescue app', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a first-time visitor sees the banner and the choice is remembered', async ({ page }) => {
    await page.goto('/login');

    const banner = page.getByText('We use cookies');
    await expect(banner).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept all' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manage preferences' })).toBeVisible();

    await page.getByRole('button', { name: 'Essentials only' }).click();
    await expect(banner).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Rescue Staff Sign In' })).toBeVisible();
    await expect(banner).toBeHidden();
  });
});
