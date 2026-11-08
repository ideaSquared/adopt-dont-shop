import type { ConsoleMessage, Page, Request } from '@playwright/test';

import { test, expect } from '../../fixtures';

/**
 * Every top-level admin page mounts for a signed-in admin: its heading
 * renders, the route error boundary does not trip, and the page logs no
 * console errors or uncaught exceptions of its own. An unknown URL lands on
 * the branded 404 inside the admin layout.
 *
 * Statsig is not configured in the dev stack, so its failed network calls, the
 * Google Fonts requests (blocked by the suite's x-e2e-run header) and
 * the dev-only login panel's lookup are expected console noise and ignored.
 */

type AdminPageRoute = { path: string; heading: string };

const ADMIN_PAGES: readonly AdminPageRoute[] = [
  { path: '/', heading: 'Admin Dashboard' },
  { path: '/users', heading: 'User Management' },
  { path: '/rescues', heading: 'Rescue Management' },
  { path: '/pets', heading: 'Pet Management' },
  { path: '/applications', heading: 'Application Management' },
  { path: '/inbox', heading: 'Triage Inbox' },
  { path: '/moderation', heading: 'Content Moderation' },
  { path: '/support', heading: 'Support Tickets' },
  { path: '/messages', heading: 'Message Monitoring' },
  { path: '/analytics', heading: 'Platform Analytics' },
  { path: '/reports', heading: 'Reports' },
  { path: '/content-management', heading: 'Content Management' },
  { path: '/configuration', heading: 'System Configuration' },
  { path: '/field-permissions', heading: 'Field Permissions' },
  { path: '/privacy-tools', heading: 'Privacy Tools' },
  { path: '/audit', heading: 'Audit Logs' },
  { path: '/account', heading: 'Account Settings' },
  { path: '/security', heading: 'Security Center' },
];

const API_QUIET_MS = 750;

const EXPECTED_NOISE =
  /statsig|featureassets|assetsconfigcdn|seeded-users|fonts\.(gstatic|googleapis)\.com/i;

const isAppError = (message: ConsoleMessage): boolean =>
  message.type() === 'error' &&
  !EXPECTED_NOISE.test(message.text()) &&
  !EXPECTED_NOISE.test(message.location().url);

const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', message => {
    if (isAppError(message)) {
      errors.push(`console: ${message.text()} (${message.location().url})`);
    }
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  return errors;
};

/**
 * Headings render before a page's initial data requests finish, so a failed
 * load can log its error after the heading is already visible. Track gateway
 * requests from the start of the navigation; once none has been in flight for
 * a short quiet period the initial loading is over.
 */
const trackApiRequests = (page: Page): (() => Promise<void>) => {
  const inFlight = new Set<Request>();
  let lastActivity = Date.now();
  const settle = (request: Request): void => {
    inFlight.delete(request);
    lastActivity = Date.now();
  };
  page.on('request', request => {
    if (!request.url().includes('/api/')) {
      return;
    }
    inFlight.add(request);
    lastActivity = Date.now();
  });
  page.on('requestfinished', settle);
  page.on('requestfailed', settle);
  return () =>
    expect
      .poll(() => inFlight.size === 0 && Date.now() - lastActivity >= API_QUIET_MS, {
        timeout: 30_000,
        message: 'initial API requests did not finish',
      })
      .toBe(true);
};

test.describe('admin pages load', () => {
  for (const { path, heading } of ADMIN_PAGES) {
    test(`${path} renders "${heading}" without errors`, async ({ page }) => {
      const errors = collectErrors(page);
      const apiSettled = trackApiRequests(page);

      await page.goto(path);

      await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible(
        { timeout: 30_000 }
      );
      await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}$`));
      await apiSettled();
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('an unknown route shows the 404 page inside the admin layout', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: /this page ran away/i })).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();

    await page.getByRole('link', { name: /back to dashboard/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('legacy moderation URLs redirect to /moderation', async ({ page }) => {
    for (const legacy of ['/moderation/queue', '/moderation/reports', '/moderation/sanctions']) {
      await page.goto(legacy);
      await expect(page).toHaveURL(/\/moderation$/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { level: 1, name: 'Content Moderation' })).toBeVisible(
        { timeout: 30_000 }
      );
    }
  });
});
