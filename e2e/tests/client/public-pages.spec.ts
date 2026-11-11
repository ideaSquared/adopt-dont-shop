import { test, expect } from '../../fixtures';
import { skipSwipeIntro } from '../../helpers/swipe-intro';

/**
 * The public marketing and legal pages load for a visitor with real content.
 * Manual QA: CLI-020, CLI-122, CLI-123.
 *
 * Signed-out visits always produce 401/400 network noise (session bootstrap)
 * and third-party feature-flag failures, so "no console errors" means no
 * uncaught exception on the page, not a silent console.
 */
const PLACEHOLDER_NOTICE = /placeholder copy|source of truth for the published policy text/i;

const PAGES: ReadonlyArray<{ path: string; heading: RegExp; content: RegExp }> = [
  { path: '/', heading: /find your next\s+companion/i, content: /featured pets/i },
  { path: '/terms', heading: /^terms of service$/i, content: /acceptance of terms/i },
  { path: '/privacy', heading: /^privacy policy$/i, content: /what we collect/i },
  { path: '/cookies', heading: /^cookie policy$/i, content: /what cookies are/i },
  { path: '/about', heading: /about adopt don't shop/i, content: /connects rescue organizations/i },
  { path: '/blog', heading: /^blog$/i, content: /news, stories, and updates/i },
  { path: '/help', heading: /^help center$/i, content: /answers to common questions/i },
  { path: '/contact', heading: /^contact us$/i, content: /for general enquiries/i },
];

test.describe('public pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeIntro(page);
  });

  for (const { path, heading, content } of PAGES) {
    test(`${path} loads with its content and no page errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.goto(path);

      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(main.getByText(content).first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  for (const path of ['/terms', '/privacy']) {
    // The legal pages used to show the maintainer notes ("Source of truth ...",
    // "Placeholder copy - must be reviewed by legal counsel"), which this test
    // tracked as a known bug with test.fail(). The redesigned pages (#1658) no
    // longer render them, so it is a plain test now.
    test(`${path} shows no placeholder or maintainer text`, async ({ page }) => {
      await page.goto(path);
      const main = page.getByRole('main');
      await expect(main.getByRole('heading').first()).toBeVisible();

      await expect(main.getByText(PLACEHOLDER_NOTICE)).toHaveCount(0);
    });
  }

  test('the contact page gives mailto addresses for enquiries and legal questions', async ({
    page,
  }) => {
    // /contact has no form, only mailto links, so the empty-submit and
    // valid-submit halves of CLI-123 have nothing to drive.
    await page.goto('/contact');

    await expect(page.getByRole('link', { name: 'privacy@adoptdontshop.app' })).toHaveAttribute(
      'href',
      'mailto:privacy@adoptdontshop.app'
    );
    await expect(page.getByRole('link', { name: 'legal@adoptdontshop.app' })).toHaveAttribute(
      'href',
      'mailto:legal@adoptdontshop.app'
    );
    await expect(page.getByRole('main').getByRole('textbox')).toHaveCount(0);
  });
});
