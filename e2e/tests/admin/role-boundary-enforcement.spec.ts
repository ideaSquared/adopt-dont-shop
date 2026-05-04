import { test, expect, ROLES } from '../../fixtures';
import { URLS } from '../../playwright.config';

test.describe('role boundary enforcement', () => {
  test('an adopter cannot reach the admin dashboard', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: URLS.admin });
    const page = await context.newPage();
    try {
      await page.goto('/login');
      await page.getByLabel(/email/i).first().fill(ROLES.adopter.email);
      await page
        .getByLabel(/password/i)
        .first()
        .fill(ROLES.adopter.password);
      await page
        .getByRole('button', { name: /^(sign in|log ?in)$/i })
        .first()
        .click();

      // Two acceptable behaviours:
      //   (a) login is rejected outright with an "unauthorised" message.
      //   (b) login redirects away from /admin or shows a forbidden page.
      const forbidden = page
        .getByText(/(forbidden|not authori[sz]ed|permission denied|access denied)/i)
        .first();
      const rejected = page.getByText(/(invalid|incorrect).*(credentials|email|password)/i).first();
      await expect(forbidden.or(rejected)).toBeVisible({ timeout: 15_000 });
    } finally {
      await context.close();
    }
  });
});
