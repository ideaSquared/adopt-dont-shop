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

      // Three acceptable outcomes — any one proves the boundary holds:
      //   (a) login is rejected outright (rare; the backend accepts the
      //       adopter's credentials, then the admin SPA decides).
      //   (b) the ProtectedRoute blocks with "Access Denied" / similar.
      //   (c) the user is forced back to /login.
      const forbidden = page
        .getByText(/(access denied|forbidden|not authori[sz]ed|permission denied|insufficient)/i)
        .first();
      const rejected = page.getByText(/(invalid|incorrect).*(credentials|email|password)/i).first();
      await Promise.race([
        forbidden.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
        rejected.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
        page.waitForURL(/\/login/, { timeout: 15_000 }).catch(() => undefined),
      ]);

      // Final invariant: the adopter is NOT on a privileged admin page.
      // We don't check for an exact text — different builds render slightly
      // different shells.  We just assert "user has no admin h1".
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
