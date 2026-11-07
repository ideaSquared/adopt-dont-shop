import { test, expect } from '../../fixtures';
import { ROLES } from '../../fixtures/roles';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { URLS } from '../../playwright.config';

/**
 * Sign-in guards in the rescue app: signed-out visitors are bounced to /login,
 * a wrong password signs nobody in, and signing out leaves no data behind.
 * (RES-003, RES-004, RES-006)
 */
const SIGNED_OUT = { cookies: [], origins: [] };

test.describe('signed-out visitors', () => {
  test.use({ storageState: SIGNED_OUT });

  for (const path of ['/pets', '/staff']) {
    test(`${path} redirects to the login page`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Rescue Staff Sign In' })).toBeVisible();
    });
  }

  test('a wrong password shows a generic error and does not sign in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(ROLES.rescue.email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill('definitely-not-the-password');
    await page
      .getByRole('button', { name: /^(sign in|log ?in)$/i })
      .first()
      .click();

    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible();
    // Generic: it must not reveal whether the account exists or which field was wrong.
    await expect(alert).not.toContainText(/no (such )?(user|account)|not found|does not exist/i);
    await expect(page).toHaveURL(/\/login$/);

    // Still signed out: a protected page bounces back to the login screen.
    await page.goto('/pets');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('signing out', () => {
  test('pressing Back after sign out shows no rescue data', async ({ browser }) => {
    // A fresh login in its own context, so signing out cannot revoke the
    // session the other specs share through the stored auth state.
    const context = await browser.newContext({ baseURL: URLS.rescue, storageState: SIGNED_OUT });
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);
      await loginViaUI(page, ROLES.rescue.email, ROLES.rescue.password);
      await page.goto('/pets');
      await expect(page.getByRole('heading', { name: 'Pet Management' })).toBeVisible();

      await page.getByRole('button', { name: 'Sign Out' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.goBack();

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Rescue Staff Sign In' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pet Management' })).toBeHidden();
    } finally {
      await context.close();
    }
  });
});
