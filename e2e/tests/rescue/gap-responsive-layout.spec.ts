import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';

/**
 * RES-102: the dashboard, pets and applications pages are usable at tablet
 * (768px) and phone (375px) widths: the page does not scroll sideways, the
 * heading is on screen, and the sidebar collapses behind a menu button that
 * opens it and lets the user move between pages.
 */
const PAGES = [
  { path: '/', heading: 'Rescue Dashboard' },
  { path: '/pets', heading: 'Pet Management' },
  { path: '/applications', heading: 'Application Management' },
] as const;

const VIEWPORTS = [
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 375, height: 812 },
] as const;

// How far the page is wider than the screen (0 when it fits).
const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} layout (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const { path, heading } of PAGES) {
      test(`RES-102: ${path} fits the screen`, async ({ page }) => {
        await page.goto(path);
        await dismissCookieBannerPatiently(page);

        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({
          timeout: 30_000,
        });
        await page.waitForLoadState('networkidle');

        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      });
    }

    test('RES-102: the sidebar collapses behind a menu button that opens it', async ({ page }) => {
      await page.goto('/pets');
      await dismissCookieBannerPatiently(page);
      await expect(page.getByRole('heading', { name: 'Pet Management', exact: true })).toBeVisible({
        timeout: 30_000,
      });

      // Collapsed: the page content is not covered by a permanent sidebar.
      const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
      await expect(menuButton).toBeVisible();
      await expect(page.getByRole('link', { name: 'Applications' })).toBeHidden();

      // Opened: the links are there, and following one moves to that page.
      await menuButton.click();
      await page.getByRole('link', { name: 'Applications' }).click();
      await expect(page).toHaveURL(/\/applications$/);
      await expect(
        page.getByRole('heading', { name: 'Application Management', exact: true })
      ).toBeVisible({ timeout: 30_000 });
    });
  });
}
