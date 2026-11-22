import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { expectNoAxeViolations } from '../../helpers/axe';
import { findAvailablePetId } from '../../helpers/pet';
import { AUTH_FILES } from '../../playwright.config';

/**
 * ADS-1326: axe-core gate (WCAG 2.2 AA) for the main pages of app.client.
 *
 * Runs on the `a11y` Playwright project (see playwright.config.ts), which is
 * logged out by default: the public pages are checked as a visitor sees them,
 * the adopter's own pages as the seeded adopter. Tolerated violations live in
 * known-violations.ts, per rule and per page; there are no global exclusions.
 */

async function settle(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('axe accessibility smoke: app.client @smoke', () => {
  test('the client home page has no axe violations', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await expectNoAxeViolations(page, 'client /');
  });

  test('the search page has no axe violations', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('heading', { level: 2, name: /Pets? Found/ })).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForLoadState('networkidle');
    await expectNoAxeViolations(page, 'client /search');
  });

  test('a pet detail page has no axe violations', async ({ page }) => {
    const petId = await findAvailablePetId();
    test.skip(!petId, 'no available pets in the seed set');
    await page.goto(`/pets/${petId}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
    await settle(page);
    await expectNoAxeViolations(page, 'client /pets/:id');
  });

  test('the login page has no axe violations', async ({ page }) => {
    await page.goto('/login');
    await settle(page);
    await expectNoAxeViolations(page, 'client /login');
  });

  test('the register page has no axe violations', async ({ page }) => {
    await page.goto('/register');
    await settle(page);
    await expectNoAxeViolations(page, 'client /register');
  });

  test.describe('signed in as an adopter', () => {
    test.use({ storageState: AUTH_FILES.adopter });

    test('the applications dashboard has no axe violations', async ({ page }) => {
      await page.goto('/applications');
      await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForLoadState('networkidle');
      await expectNoAxeViolations(page, 'client /applications');
    });

    test('the favourites page has no axe violations', async ({ page }) => {
      await page.goto('/favorites');
      await settle(page);
      await expectNoAxeViolations(page, 'client /favorites');
    });
  });
});
