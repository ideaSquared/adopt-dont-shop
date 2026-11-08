import { request as playwrightRequest } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { openRoleContext } from '../../helpers/cross-app-sessions';
import { uniqueEmail, uniquePetName, uniqueRescueName } from '../../helpers/factories';
import { postWithCsrf } from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { peekInvitationToken } from '../../helpers/token-peek';
import { loginViaUI } from '../../helpers/auth';
import { URLS } from '../../playwright.config';

const PASSWORD = 'BehaviourTest123!';

/**
 * X-002: a new rescue is onboarded. The rescue registers, an admin approves it
 * in the admin app, the rescue signs in and lists a pet, and an adopter finds
 * that pet in the client's search.
 *
 * The first test covers the public sign-up form on its own; the second starts
 * from a rescue that already exists (created through the admin API) because
 * the sign-up form is broken, and covers approve -> sign in -> add pet -> find.
 */
test.describe('X-002 new rescue onboarding', () => {
  // /register-rescue registers a rescue and its owner for anonymous visitors (fixed in #1606).
  test('a visitor registers a rescue at /register-rescue and an admin sees it pending', async ({
    browser,
  }) => {
    const rescueName = uniqueRescueName('X002 Form');
    const ownerEmail = uniqueEmail('x002-owner');

    const visitorContext = await browser.newContext({
      baseURL: URLS.rescue,
      storageState: { cookies: [], origins: [] },
    });
    const adminContext = await openRoleContext(browser, 'admin');
    try {
      const visitor = await visitorContext.newPage();
      await dismissCookieBannerPatiently(visitor);
      await visitor.goto('/register-rescue');

      await visitor.getByLabel('First Name').fill('Rae');
      await visitor.getByLabel('Last Name').fill('Scue');
      await visitor.getByLabel('Email', { exact: true }).fill(ownerEmail);
      await visitor.getByLabel('Password', { exact: true }).fill(PASSWORD);
      await visitor.getByLabel('Confirm Password').fill(PASSWORD);
      await visitor.getByRole('button', { name: 'Next' }).click();

      await visitor.getByLabel('Organisation Name').fill(rescueName);
      await visitor.getByLabel('Contact Email').fill(ownerEmail);
      await visitor.getByRole('button', { name: 'Next' }).click();

      await visitor.getByLabel('Address', { exact: true }).fill('1 Rescue Lane');
      await visitor.getByLabel('City').fill('London');
      await visitor.getByLabel('Postcode').fill('SW1A 1AA');
      await visitor.getByRole('button', { name: 'Next' }).click();
      await visitor.getByRole('button', { name: 'Next' }).click();
      await visitor.getByRole('button', { name: 'Submit Registration' }).click();

      await expect(visitor.getByRole('heading', { name: 'Registration Successful' })).toBeVisible({
        timeout: 15_000,
      });

      const admin = await adminContext.newPage();
      await dismissCookieBannerPatiently(admin);
      await admin.goto('/rescues');
      await admin.getByPlaceholder('Search by name, city, or email...').fill(rescueName);
      const row = admin.getByRole('row').filter({ hasText: rescueName });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row.getByText('Pending Review')).toBeVisible();
    } finally {
      await visitorContext.close();
      await adminContext.close();
    }
  });

  test('an admin approves a pending rescue, its owner lists a pet and adopters find it', async ({
    browser,
    apiAs,
  }) => {
    // Four apps' worth of steps, well past the 60s default.
    test.setTimeout(180_000);

    const rescueName = uniqueRescueName('X002 Rescue');
    const petName = uniquePetName('X002Pet');
    const ownerEmail = uniqueEmail('x002-owner');

    // Setup: a pending rescue and an owner who accepted the admin's invitation.
    const adminApi = await apiAs('admin');
    const created = await postWithCsrf(adminApi.context, '/api/v1/rescues', {
      name: rescueName,
      email: uniqueEmail('x002-rescue'),
      address: '1 Rescue Lane',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
      contact_person: 'Rae Scue',
    });
    expect(created.status()).toBe(201);
    const { data: rescue } = (await created.json()) as { data: { rescue_id: string } };
    const invited = await postWithCsrf(
      adminApi.context,
      `/api/v1/rescues/${rescue.rescue_id}/invitations`,
      { email: ownerEmail, title: 'Manager' }
    );
    expect(invited.status()).toBe(201);
    const token = await peekInvitationToken(ownerEmail, rescue.rescue_id);
    expect(token, 'no invitation token for the rescue owner').toBeTruthy();
    const anon = await playwrightRequest.newContext({ baseURL: URLS.api });
    try {
      const accepted = await postWithCsrf(anon, '/api/v1/invitations/accept', {
        token,
        password: PASSWORD,
        firstName: 'Rae',
        lastName: 'Scue',
      });
      expect(accepted.status()).toBe(201);
    } finally {
      await anon.dispose();
    }

    const adminContext = await openRoleContext(browser, 'admin');
    const ownerContext = await browser.newContext({
      baseURL: URLS.rescue,
      storageState: { cookies: [], origins: [] },
    });
    const adopterContext = await browser.newContext({
      baseURL: URLS.client,
      storageState: { cookies: [], origins: [] },
    });
    try {
      // Admin: the new rescue is waiting for review; approve it.
      const admin = await adminContext.newPage();
      await dismissCookieBannerPatiently(admin);
      await admin.goto('/rescues');
      await admin.getByPlaceholder('Search by name, city, or email...').fill(rescueName);
      const row = admin.getByRole('row').filter({ hasText: rescueName });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row.getByText('Pending Review')).toBeVisible();
      await row.getByRole('button', { name: 'Approve' }).click();
      await admin.getByRole('button', { name: 'Approve Rescue' }).click();
      await expect(row.getByText('Verified', { exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(row.getByText('Pending Review')).toHaveCount(0);

      // Rescue owner: sign in to the rescue app and add a pet.
      const owner = await ownerContext.newPage();
      await dismissCookieBannerPatiently(owner);
      await loginViaUI(owner, ownerEmail, PASSWORD);
      await owner.goto('/pets');
      await owner.getByRole('button', { name: 'Add New Pet' }).click();
      await owner.getByRole('textbox', { name: 'Pet Name *' }).fill(petName);
      await owner.getByRole('textbox', { name: 'Short Description' }).fill('Loves long walks.');
      const createdPet = owner.waitForResponse(
        res => res.url().endsWith('/api/v1/pets') && res.request().method() === 'POST'
      );
      await owner.getByRole('button', { name: 'Add Pet', exact: true }).click();
      expect((await createdPet).status()).toBe(201);
      await expect(owner.getByRole('heading', { name: petName, level: 3 })).toBeVisible({
        timeout: 15_000,
      });

      // Client: an adopter searches for the pet by name and finds it.
      const adopter = await adopterContext.newPage();
      await skipSwipeIntro(adopter);
      await dismissCookieBannerPatiently(adopter);
      await adopter.goto('/search');
      const main = adopter.getByRole('main');
      const searchInput = main
        .getByRole('searchbox')
        .or(main.getByPlaceholder(/search/i))
        .first();
      await searchInput.fill(petName);
      await searchInput.press('Enter');
      await expect(main.getByRole('heading', { level: 3, name: petName })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await adminContext.close();
      await ownerContext.close();
      await adopterContext.close();
    }
  });
});
