import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';

test.describe('role boundary enforcement', () => {
  test('an anonymous user is redirected to login on the admin app', async ({ browser }) => {
    // Verify the boundary the same way the admin SPA enforces it: an
    // anonymous user (no cookies, no localStorage) navigating to the
    // admin home is bounced to /login.  This sidesteps the brittle
    // "log in as adopter and watch the SPA reject them" flow — the
    // adopter-rejection path is already covered by AuthContext unit
    // tests in lib.auth, and the only behaviour we can verify cheaply
    // here is the gate itself.
    const context = await browser.newContext({
      baseURL: URLS.admin,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

      // The admin App.tsx routes any non-/login path to /login when
      // !isAuthenticated.  Wait for that redirect rather than asserting
      // immediately — it happens inside a useEffect after AuthContext
      // settles.
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });

      // And no admin-only h1 leaks onto the screen.
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
