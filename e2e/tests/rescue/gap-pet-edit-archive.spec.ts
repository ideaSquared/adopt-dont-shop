import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { openAdopterBrowser } from '../../helpers/adopter-browser';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet } from '../../helpers/seeds';

// The pet's whole card: the nearest block around its name that holds the select checkbox.
const petCard = (page: Page, name: string) =>
  page
    .getByRole('heading', { name, level: 3 })
    .locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]');

// The client search for one pet by name (the search box's own ?q= deep link).
const searchClientFor = async (page: Page, name: string): Promise<void> => {
  await page.goto(`/search?q=${encodeURIComponent(name)}`);
  await expect(page.getByPlaceholder('Search by name, breed, or description...')).toHaveValue(name);
};

/**
 * RES-023: editing a pet in the rescue app persists and shows on the client pet page.
 * RES-024: archiving a pet in the rescue app takes it off the client search.
 */
test.describe('editing and archiving a pet', () => {
  test('RES-023: an edited description and status persist and show on the client pet page', async ({
    page,
    apiAs,
    browser,
  }) => {
    const rescueApi = await apiAs('rescue');
    const { petId, name } = await createAvailablePet(rescueApi, 'EditMe');
    const shortDescription = uniqueText('Short blurb');
    const longDescription = uniqueText('Long story about this lovely animal');

    await page.goto(`/pets?search=${encodeURIComponent(name)}`);
    await dismissCookieBannerWhenShown(page);
    const card = petCard(page, name);
    await expect(card).toBeVisible({ timeout: 30_000 });

    // Change the descriptions in the edit form.
    await card.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Pet' });
    await dialog.getByLabel('Short Description').fill(shortDescription);
    await dialog.getByLabel('Long Description').fill(longDescription);
    await dialog.getByRole('button', { name: 'Update Pet' }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText(shortDescription)).toBeVisible();

    // Change the status from the card.
    await card.getByLabel(`Change status for ${name}`).selectOption('pending');
    await expect(card.getByRole('status', { name: 'Pending', exact: true })).toBeVisible();

    // Both survive a reload.
    await page.reload();
    await expect(card.getByText(shortDescription)).toBeVisible({ timeout: 30_000 });
    await expect(card.getByRole('status', { name: 'Pending', exact: true })).toBeVisible();

    // The adopter sees them on the client pet page.
    const adopter = await openAdopterBrowser(browser);
    try {
      await adopter.page.goto(`/pets/${petId}`);
      await expect(adopter.page.getByRole('heading', { name, level: 1 })).toBeVisible({
        timeout: 20_000,
      });
      await expect(adopter.page.getByText(longDescription)).toBeVisible();
      await expect(adopter.page.getByText('Adoption Pending', { exact: true })).toBeVisible();
    } finally {
      await adopter.context.close();
    }
  });

  // App bug: the card's "Hold" status option sends `on_hold`, which the pets
  // service does not know (its statuses are medical_hold / behavioral_hold /
  // not_available), so the change is refused with "to_status is required" and
  // the pet stays Available. Remove test.fail once Hold maps to a real status.
  test.fail('RES-023: choosing Hold on the card puts the pet on hold', async ({ page, apiAs }) => {
    const rescueApi = await apiAs('rescue');
    const { name } = await createAvailablePet(rescueApi, 'HoldMe');

    await page.goto(`/pets?search=${encodeURIComponent(name)}`);
    await dismissCookieBannerWhenShown(page);
    const card = petCard(page, name);
    await expect(card).toBeVisible({ timeout: 30_000 });

    await card.getByLabel(`Change status for ${name}`).selectOption('on_hold');

    await expect(card.getByText('On Hold', { exact: true })).toBeVisible();
    await expect(page.getByText('to_status is required')).toBeHidden();
  });

  test('RES-024: an archived pet disappears from the client search', async ({
    page,
    apiAs,
    browser,
  }) => {
    const rescueApi = await apiAs('rescue');
    const { petId, name } = await createAvailablePet(rescueApi, 'ArchiveMe');

    // It is listed for adopters before it is archived.
    const adopter = await openAdopterBrowser(browser);
    try {
      await searchClientFor(adopter.page, name);
      await expect(adopter.page.getByRole('heading', { name: '1 Pet Found' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(adopter.page.getByRole('heading', { name, level: 3 })).toBeVisible();

      // The rescue archives it from the bulk-action bar.
      await page.goto(`/pets?search=${encodeURIComponent(name)}`);
      await dismissCookieBannerWhenShown(page);
      await page.getByLabel(`Select ${name} for bulk action`).check({ timeout: 30_000 });
      await page
        .getByRole('region', { name: 'Bulk pet actions' })
        .getByRole('button', { name: 'Archive' })
        .click();
      await expect(page.getByText(/Bulk action complete: 1 succeeded, 0 failed/)).toBeVisible();

      // The client search no longer lists it, and its page is gone.
      await searchClientFor(adopter.page, name);
      await expect(adopter.page.getByRole('heading', { name: '0 Pets Found' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(adopter.page.getByRole('heading', { name, level: 3 })).toBeHidden();
      await adopter.page.goto(`/pets/${petId}`);
      await expect(adopter.page.getByRole('heading', { name: 'Pet Not Found' })).toBeVisible();
    } finally {
      await adopter.context.close();
    }
  });
});
