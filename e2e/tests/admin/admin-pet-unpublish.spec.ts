import { test, expect } from '../../fixtures';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { petCardLocator } from '../../helpers/pet';
import { createAvailablePet } from '../../helpers/seeds';
import { URLS } from '../../playwright.config';

/**
 * An admin unpublishes a pet from the Pets page and it drops out of the public
 * adoption search. Runs on a pet the rescue persona creates for this test, so
 * no seeded pet changes status.
 */
test.describe('unpublishing a pet in the admin app', () => {
  test('an admin unpublishes a pet and it disappears from the client search', async ({
    page,
    apiAs,
    browser,
  }) => {
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'Unpublish');

    const visitorContext = await browser.newContext({
      baseURL: URLS.client,
      storageState: { cookies: [], origins: [] },
    });
    const visitor = await visitorContext.newPage();
    await dismissCookieBannerPatiently(visitor);
    const petCard = petCardLocator(visitor).filter({ hasText: pet.name });

    try {
      await visitor.goto(`/search?q=${encodeURIComponent(pet.name)}`);
      await expect(petCard.first()).toBeVisible({ timeout: 30_000 });

      await dismissCookieBannerPatiently(page);
      await page.goto('/pets');
      await page.getByPlaceholder('Search by name or breed...').fill(pet.name);
      await expect(page.getByRole('row')).toHaveCount(2, { timeout: 30_000 });
      await page.getByRole('checkbox', { name: /select row/i }).check();

      await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Unpublish 1 pet?')).toBeVisible();
      await dialog
        .getByPlaceholder('Explain why these pets are being unpublished...')
        .fill('E2E: listing taken down for review');
      await dialog.getByRole('button', { name: 'Unpublish Pets' }).click();
      await expect(dialog.getByText(/1 .*succe/i)).toBeVisible({ timeout: 30_000 });

      await visitor.goto(`/search?q=${encodeURIComponent(pet.name)}`);
      await expect(visitor.getByText(/no pets match your filters/i)).toBeVisible({
        timeout: 30_000,
      });
      await expect(petCard).toHaveCount(0);
    } finally {
      await visitorContext.close();
    }
  });
});
