import type { Browser, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { SECONDARY_USERS, ROLES } from '../../fixtures/roles';
import { loginViaUI } from '../../helpers/auth';
import { URLS } from '../../playwright.config';

/**
 * Who can reach what in the admin app: signed-out visitors are sent to the
 * login page (and shown the cookie banner), signing out leaves no data behind,
 * and a moderator can use the moderation page but not the admin-only pages.
 */

const SIGNED_OUT = { cookies: [], origins: [] };

const openSignedOutPage = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({ baseURL: URLS.admin, storageState: SIGNED_OUT });
  return context.newPage();
};

const openModeratorPage = async (browser: Browser): Promise<Page> => {
  const page = await openSignedOutPage(browser);
  await loginViaUI(page, SECONDARY_USERS.adminMod, ROLES.admin.password);
  return page;
};

test.describe('signed-out access to the admin app', () => {
  for (const path of ['/users', '/audit']) {
    test(`visiting ${path} while signed out redirects to /login`, async ({ browser }) => {
      const page = await openSignedOutPage(browser);
      try {
        await page.goto(path);

        await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
        await expect(
          page.getByRole('heading', { name: /user management|audit logs/i })
        ).toHaveCount(0);
      } finally {
        await page.context().close();
      }
    });
  }

  test('an anonymous visitor sees the cookie banner and the choice is remembered', async ({
    browser,
  }) => {
    const page = await openSignedOutPage(browser);
    try {
      await page.goto('/login');
      const banner = page.getByRole('heading', { name: 'We use cookies' });
      await expect(banner).toBeVisible({ timeout: 30_000 });

      await page.getByRole('button', { name: 'Essentials only' }).click();
      await expect(banner).toBeHidden();

      await page.reload();
      await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(banner).toBeHidden();
    } finally {
      await page.context().close();
    }
  });
});

test.describe('signing out of the admin app', () => {
  test('after signing out, Back shows no admin data', async ({ browser }) => {
    // A moderator signs in on a fresh context so signing out never touches the
    // shared admin session the rest of the suite reuses.
    const page = await openModeratorPage(browser);
    try {
      await page.goto('/moderation');
      await expect(page.getByRole('heading', { level: 1, name: 'Content Moderation' })).toBeVisible(
        { timeout: 30_000 }
      );

      await page.getByRole('button', { name: 'User menu' }).click();
      await page.getByRole('button', { name: 'Sign Out' }).click();
      await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

      await page.goBack();

      await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Content Moderation' })).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });
});

test.describe('moderator role limits', () => {
  test('a moderator can use the moderation page', async ({ browser }) => {
    const page = await openModeratorPage(browser);
    try {
      await page.goto('/moderation');

      await expect(page.getByRole('heading', { level: 1, name: 'Content Moderation' })).toBeVisible(
        { timeout: 30_000 }
      );
      await expect(page.getByRole('heading', { name: 'Insufficient Permissions' })).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  for (const path of ['/configuration', '/audit', '/notifications/broadcast']) {
    test(`a moderator is blocked from ${path}`, async ({ browser }) => {
      const page = await openModeratorPage(browser);
      try {
        await page.goto(path);

        await expect(page.getByRole('heading', { name: 'Insufficient Permissions' })).toBeVisible({
          timeout: 30_000,
        });
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: /system configuration|audit logs|broadcast notifications/i,
          })
        ).toHaveCount(0);
      } finally {
        await page.context().close();
      }
    });
  }
});
