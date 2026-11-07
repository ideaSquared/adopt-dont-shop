import type { Browser, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { ROLES } from '../../fixtures/roles';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { URLS } from '../../playwright.config';

/**
 * Signing in to the admin app through the login form (ADM-001, ADM-002).
 * Every test starts signed out so the shared admin session is never touched.
 */

const openSignedOutLogin = async (browser: Browser): Promise<Page> => {
  const context = await browser.newContext({
    baseURL: URLS.admin,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await dismissCookieBannerPatiently(page);
  await page.goto('/login');
  await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 30_000 });
  return page;
};

const submitCredentials = async (page: Page, email: string, password: string): Promise<void> => {
  await page.getByLabel(/email/i).first().fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
};

test.describe('admin sign-in', () => {
  test('an admin signs in on /login and lands on the dashboard', async ({ browser }) => {
    const page = await openSignedOutLogin(browser);
    try {
      await submitCredentials(page, ROLES.admin.email, ROLES.admin.password);

      await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await page.context().close();
    }
  });

  const REJECTED_PERSONAS = [
    { persona: 'adopter', userType: 'adopter' },
    { persona: 'rescue', userType: 'rescue_staff' },
  ] as const;

  for (const { persona, userType } of REJECTED_PERSONAS) {
    test(`the ${persona} persona is rejected by the admin login`, async ({ browser }) => {
      const page = await openSignedOutLogin(browser);
      try {
        await submitCredentials(page, ROLES[persona].email, ROLES[persona].password);

        await expect(page.getByRole('alert')).toContainText(
          `This app is for admin and moderator and super_admin users only. As a ${userType}`,
          { timeout: 30_000 }
        );
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);

        // Nothing was stored: a reload still lands on the login form.
        await page.goto('/users');
        await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
      } finally {
        await page.context().close();
      }
    });
  }
});
