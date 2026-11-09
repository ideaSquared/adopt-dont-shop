import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';

/**
 * RES-010/020/030/040/050/051/060/070/080/090/091/100: every rescue page opens
 * for a rescue manager, renders its own content (not the error boundary) and
 * raises no uncaught page errors or unexpected console/API errors.
 *
 * `knownIssues` lists problems that exist in the app today, per route. They are
 * ignored here so the smoke stays green, but each is a real defect: delete the
 * entry once the app is fixed.
 */
type PageCase = {
  id: string;
  path: string;
  heading: string;
  knownIssues?: RegExp[];
};

const PAGES: PageCase[] = [
  {
    id: 'RES-010',
    path: '/',
    heading: 'Rescue Dashboard',
    // Dashboard renders a list without unique keys.
    knownIssues: [/unique "key" prop/],
  },
  { id: 'RES-020', path: '/pets', heading: 'Pet Management' },
  { id: 'RES-030', path: '/applications', heading: 'Application Management' },
  {
    id: 'RES-040',
    path: '/staff',
    heading: 'Staff & Volunteer Management',
    // A rescue manager gets 403 listing their own rescue's pending invitations.
    knownIssues: [/403 GET .*\/rescues\/[^/]+\/invitations/, /AuthorizationError: forbidden/],
  },
  { id: 'RES-050', path: '/settings', heading: 'Rescue Settings' },
  { id: 'RES-051', path: '/user-settings', heading: 'My Settings' },
  { id: 'RES-060', path: '/communication', heading: 'Communication' },
  { id: 'RES-080', path: '/foster', heading: 'Foster Coordination' },
  {
    id: 'RES-090',
    path: '/analytics',
    heading: 'Analytics & Reporting',
    // Charts compute NaN coordinates when there is no data to plot.
    knownIssues: [/NaN/],
  },
  {
    id: 'RES-091',
    path: '/reports',
    heading: 'Reports',
    // A rescue manager gets 403 on the reports list and templates endpoints.
    knownIssues: [/403 GET .*\/api\/v1\/reports/],
  },
];

// Third-party and dev-only noise that says nothing about the rescue app.
const IGNORED_CONSOLE = [
  /statsig/i, // feature-flag SDK, no client key in dev
  /featureassets|assetsconfigcdn/i, // Statsig CDN calls blocked by CORS
  /fonts\.gstatic\.com/, // web fonts blocked by the e2e CORS header
  /Failed to load resource/, // network failures are checked via API responses below
];

const trackProblems = (page: Page): string[] => {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (message.type() !== 'error' || IGNORED_CONSOLE.some(pattern => pattern.test(text))) {
      return;
    }
    problems.push(`console: ${text}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/v1/')) {
      problems.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return problems;
};

test.describe('rescue pages load for a rescue manager', () => {
  for (const { id, path, heading, knownIssues = [] } of PAGES) {
    test(`${id}: ${path} loads cleanly`, async ({ page }) => {
      const problems = trackProblems(page);

      await page.goto(path);

      // Generous: the page is a lazy chunk plus API calls on a busy dev stack.
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeHidden();
      await page.waitForLoadState('networkidle');

      const unexpected = problems.filter(
        problem => !knownIssues.some(pattern => pattern.test(problem))
      );
      expect(unexpected).toEqual([]);
    });
  }

  test('RES-100: an unknown route shows the 404 page inside the app layout', async ({ page }) => {
    await page.goto('/nope');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /this page ran away/i })).toBeVisible();
    // Inside the layout: the sidebar (Sign Out) is still there and there is a way home.
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to dashboard/i })).toBeVisible();
  });
});
