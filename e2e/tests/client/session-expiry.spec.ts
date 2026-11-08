import type { Browser } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import { openSignedInSession } from '../../helpers/signed-in-session';

const RAW_ERROR =
  /(\b401\b|unauthori[sz]ed|\bjwt\b|invalid token|\{"error"|\bat \w+.*\(.*:\d+:\d+\)|TypeError)/i;

test.describe('session expiry', () => {
  test('an anonymous user does not see the favorites list', async ({ browser }) => {
    // The client app doesn't hard-redirect anonymous users on protected
    // routes — instead each page renders its own login prompt.  /favorites
    // is the cleanest example: it shows a "Login Required" panel when
    // the user has no session.  We assert on that surface (the boundary
    // the user actually sees) rather than on a /login URL that never
    // arrives.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });

      const loginPrompt = page
        .getByRole('heading', { name: /login required/i })
        .or(page.getByText(/login required/i))
        .or(page.getByRole('link', { name: /sign in/i }))
        .first();
      await expect(loginPrompt).toBeVisible({ timeout: 20_000 });
    } finally {
      await context.close();
    }
  });

  // The signed-in session is destroyed while the page is open (cookies gone, as when the
  // refresh token lapses). The next thing the adopter does must land them on a sign-in
  // prompt with their account gone from the header, not on a broken page or a raw error.
  const withExpiredSession = async (browser: Browser) => {
    const session = await openSignedInSession(browser, await createVerifiedAdopter('expiry'));
    const { page } = session;
    await page.goto('/search');
    // Settle the cookie banner first: answering it later would call the API with the dead
    // session and sign the page out before the step under test.
    const essentialsOnly = page.getByRole('button', { name: 'Essentials only' });
    await expect(essentialsOnly).toBeEnabled({ timeout: 20_000 });
    await essentialsOnly.click();
    await expect(essentialsOnly).toBeHidden({ timeout: 45_000 });
    const userMenu = page.getByRole('button', { name: /user menu for/i });
    await expect(userMenu).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await session.context.clearCookies();
    return { session, page, userMenu };
  };

  test('after the session expires, opening Favorites asks the adopter to sign in', async ({
    browser,
  }) => {
    const { session, page, userMenu } = await withExpiredSession(browser);
    try {
      await page.getByRole('link', { name: /^Favorites/ }).click();
      await expect(page).toHaveURL(/\/favorites$/);
      await expect(page.getByRole('heading', { name: /login required/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(userMenu).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText(RAW_ERROR);

      await page.getByRole('link', { name: /sign in to view favorites/i }).click();
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole('button', { name: /^(sign in|log ?in)$/i }).first()
      ).toBeVisible();
    } finally {
      await session.close();
    }
  });

  test('after the session expires, My Applications asks the adopter to log in', async ({
    browser,
  }) => {
    const { session, page, userMenu } = await withExpiredSession(browser);
    try {
      // Keyboard-open the menu: the dev-login toggle floats over the avatar.
      await userMenu.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: /my applications/i }).click();
      await expect(page).toHaveURL(/\/applications$/);
      await expect(
        page.getByRole('heading', { name: /please log in to view your applications/i })
      ).toBeVisible({ timeout: 20_000 });
      await expect(userMenu).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText(RAW_ERROR);
      await expect(page.getByRole('link', { name: 'Log In', exact: true })).toBeVisible();
    } finally {
      await session.close();
    }
  });
});
