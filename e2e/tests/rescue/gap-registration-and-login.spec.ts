import { test, expect } from '../../fixtures';
import { loginAccountViaApi } from '../../helpers/accounts';
import { ROLES } from '../../fixtures/roles';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueEmail, uniqueRescueName } from '../../helpers/factories';
import { postWithCsrf } from '../../helpers/seeds';
import { createRescueWithOwner } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

/**
 * RES-001: registering a rescue ends with a "pending approval" message, and a
 * rescue that is not approved yet cannot manage pets.
 * RES-002: signing in at /login lands on the dashboard.
 */
const SIGNED_OUT = { cookies: [], origins: [] };

test.describe('signing in', () => {
  test('RES-002: a rescue manager who signs in lands on the dashboard', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: URLS.rescue, storageState: SIGNED_OUT });
    try {
      const page = await context.newPage();
      await dismissCookieBannerWhenShown(page);

      await loginViaUI(page, ROLES.rescue.email, ROLES.rescue.password);

      await expect(page).toHaveURL(`${URLS.rescue}/`);
      await expect(
        page.getByRole('heading', { name: 'Rescue Dashboard', exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});

test.describe('registering a rescue', () => {
  test.use({ storageState: SIGNED_OUT });

  // App bug: the form cannot register anyone. POST /api/v1/rescues/register is
  // not a public route (an anonymous visitor gets 401), so the submit fails
  // before any "pending approval" message can show. Remove test.fail once a
  // visitor can register a rescue.
  test.fail(
    'RES-001: a visitor who registers a rescue is told it is pending approval',
    async ({ page }) => {
      const ownerEmail = uniqueEmail('res001-owner');
      await dismissCookieBannerWhenShown(page);
      await page.goto('/register-rescue');

      await page.getByLabel('First Name').fill('Rae');
      await page.getByLabel('Last Name').fill('Scue');
      await page.getByLabel('Email', { exact: true }).fill(ownerEmail);
      await page.getByLabel('Password', { exact: true }).fill('BehaviourTest123!');
      await page.getByLabel('Confirm Password').fill('BehaviourTest123!');
      await page.getByRole('button', { name: 'Next' }).click();

      await page.getByLabel('Organisation Name').fill(uniqueRescueName('RES001'));
      await page.getByLabel('Contact Email').fill(ownerEmail);
      await page.getByRole('button', { name: 'Next' }).click();

      await page.getByLabel('Address', { exact: true }).fill('1 Rescue Lane');
      await page.getByLabel('City').fill('London');
      await page.getByLabel('Postcode').fill('SW1A 1AA');
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Submit Registration' }).click();

      await expect(page.getByRole('heading', { name: 'Registration Successful' })).toBeVisible();
      await expect(page.getByText(/pending approval/i)).toBeVisible();
    }
  );

  // App bug: the pets service lets the owner of a rescue that is still pending
  // approval create pets (201). Remove test.fail once unapproved rescues are
  // refused.
  test.fail('RES-001: a rescue that is pending approval cannot add pets', async ({ apiAs }) => {
    const rescue = await createRescueWithOwner(await apiAs('admin'), 'Pending', {
      verified: false,
    });
    const ownerApi = await loginAccountViaApi(rescue.owner);
    try {
      const created = await postWithCsrf(ownerApi.context, '/api/v1/pets', {
        name: 'Should not list',
        type: 'dog',
        gender: 'female',
        size: 'medium',
        ageGroup: 'adult',
        rescueId: rescue.rescueId,
      });

      expect(created.status()).toBe(403);
    } finally {
      await ownerApi.dispose();
    }
  });
});
