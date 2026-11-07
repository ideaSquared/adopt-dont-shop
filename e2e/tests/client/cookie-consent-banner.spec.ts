import { test, expect } from '../../fixtures';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

/**
 * The cookie banner shows on a first visit and remembers the visitor's choice.
 * Manual QA: CLI-130. Deliberately does not use dismissCookieBannerWhenShown:
 * the banner is the thing under test.
 */
test.describe('cookie consent banner', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
  });

  test('shows on a first visit', async ({ page }) => {
    await page.goto('/');

    const banner = page.getByRole('region', { name: /cookie preferences/i });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Accept all' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Essentials only' })).toBeVisible();
  });

  for (const choice of ['Accept all', 'Essentials only']) {
    test(`"${choice}" is remembered across a reload and navigation`, async ({ page }) => {
      await page.goto('/');
      const banner = page.getByRole('region', { name: /cookie preferences/i });
      await banner.getByRole('button', { name: choice }).click();
      await expect(banner).toBeHidden();

      await page.reload();
      await expect(page.getByRole('heading', { name: /find your next/i })).toBeVisible();
      await expect(banner).toBeHidden();

      await page.goto('/about');
      await expect(page.getByRole('heading', { name: /about adopt don't shop/i })).toBeVisible();
      await expect(banner).toBeHidden();
    });
  }
});
