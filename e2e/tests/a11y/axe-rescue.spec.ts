import { test, expect } from '../../fixtures';
import { expectNoAxeViolations } from '../../helpers/axe';

/**
 * ADS-1326: axe-core gate (WCAG 2.2 AA) for the main pages of app.rescue.
 *
 * Runs on the `a11y-rescue` Playwright project, signed in as the seeded rescue
 * manager. Tolerated violations live in known-violations.ts, per rule and per
 * page; there are no global exclusions.
 */
const PAGES: ReadonlyArray<{ path: string; heading: string }> = [
  { path: '/', heading: 'Rescue Dashboard' },
  { path: '/pets', heading: 'Pet Management' },
  { path: '/applications', heading: 'Application Management' },
  { path: '/communication', heading: 'Communication' },
  { path: '/settings', heading: 'Rescue Settings' },
];

test.describe('axe accessibility smoke: app.rescue @smoke', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page, `rescue ${path}`);
    });
  }

  test.describe('signed out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('the login page has no axe violations', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page, 'rescue /login');
    });
  });
});
