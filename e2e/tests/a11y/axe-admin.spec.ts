import { test, expect } from '../../fixtures';
import { expectNoAxeViolations } from '../../helpers/axe';

/**
 * ADS-1326: axe-core gate (WCAG 2.2 AA) for the main pages of app.admin.
 *
 * Runs on the `a11y-admin` Playwright project, signed in as the seeded super
 * admin. Tolerated violations live in known-violations.ts, per rule and per
 * page; there are no global exclusions.
 */
const PAGES: ReadonlyArray<{ path: string; heading: string }> = [
  { path: '/', heading: 'Admin Dashboard' },
  { path: '/users', heading: 'User Management' },
  { path: '/rescues', heading: 'Rescue Management' },
  { path: '/pets', heading: 'Pet Management' },
  { path: '/applications', heading: 'Application Management' },
  { path: '/moderation', heading: 'Content Moderation' },
  { path: '/support', heading: 'Support Tickets' },
];

test.describe('axe accessibility smoke: app.admin @smoke', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page, `admin ${path}`);
    });
  }

  test.describe('signed out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('the login page has no axe violations', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page, 'admin /login');
    });
  });
});
