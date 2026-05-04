import { test, expect, ROLES } from '../../fixtures';
import { URLS } from '../../playwright.config';

test.describe('role boundary enforcement', () => {
  test('an adopter cannot reach the admin dashboard', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: URLS.admin });
    const page = await context.newPage();
    try {
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

      await page.getByLabel(/email/i).first().fill(ROLES.adopter.email);
      await page
        .getByLabel(/password/i)
        .first()
        .fill(ROLES.adopter.password);
      await page
        .getByRole('button', { name: /^(sign in|log ?in)$/i })
        .first()
        .click();

      // Give the SPA time to settle: it'll either redirect to /login (auth
      // failure or post-Access-Denied bounce), or render an "Access Denied"
      // page in place.  Both prove the boundary holds.
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

      // The terminal invariant we care about: the adopter never sees an
      // admin-only page heading.  We don't insist on the specific copy
      // because the SPA may render any of: Access Denied, login error
      // banner, or simply a redirect back to /login.
      const adminHeading = page
        .getByRole('heading', {
          level: 1,
          name: /(admin dashboard|user management|audit logs|support tickets)/i,
        })
        .first();
      await expect(adminHeading).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
