import { test, expect } from '../../fixtures';

/**
 * WCAG 1.4.10 (reflow): at a 320 CSS pixel wide viewport the page must not scroll horizontally.
 *
 * Runs on each a11y project, so every app is covered: client logged out, rescue and admin signed in.
 */
const PAGES: Record<string, readonly { path: string; heading?: string }[]> = {
  a11y: [{ path: '/' }, { path: '/login' }],
  'a11y-rescue': [{ path: '/', heading: 'Rescue Dashboard' }],
  'a11y-admin': [{ path: '/', heading: 'Admin Dashboard' }],
};

test.use({ viewport: { width: 320, height: 800 } });

test.describe('reflow at 320px @smoke', () => {
  test('pages do not scroll horizontally', async ({ page }, testInfo) => {
    for (const { path, heading } of PAGES[testInfo.project.name] ?? []) {
      await page.goto(path);
      const expected = heading
        ? page.getByRole('heading', { name: heading })
        : page.getByRole('heading').first();
      await expect(expected).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => {
        const main = document.getElementById('main-content');
        return Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          main ? main.scrollWidth - main.clientWidth : 0
        );
      });
      expect(overflow, `${path} overflows the 320px viewport by ${overflow}px`).toBeLessThanOrEqual(
        0
      );
    }
  });
});
