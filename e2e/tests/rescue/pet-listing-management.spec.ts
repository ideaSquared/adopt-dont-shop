import { test, expect } from '../../fixtures';
import { uniquePetName } from '../../helpers/factories';

test.describe('rescue pet listing management', () => {
  test('a rescue manager can open the pet management page', async ({ page }) => {
    await page.goto('/pets', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/pets/);

    // Any heading at all proves the SPA mounted past the route guard.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
  });

  // ADS-871: graduate the mount smoke to a real pet CRUD journey through the
  // UI — create a pet via the "Add New Pet" form, see it in the listing, then
  // edit a field via the same modal and confirm the change persisted.
  test('a rescue manager can create and edit a pet through the UI', async ({ page }) => {
    const petName = uniquePetName('UiCrud');

    await page.goto('/pets', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    // --- Create ---------------------------------------------------------
    await page.getByRole('button', { name: 'Add New Pet' }).first().click();

    // The form is a modal; scope to its dialog so we don't collide with the
    // page header's "Add New Pet" button.
    const createDialog = page.getByRole('dialog');
    await expect(createDialog.getByRole('heading', { name: /add new pet/i })).toBeVisible({
      timeout: 15_000,
    });

    await createDialog.getByLabel(/pet name/i).fill(petName);
    await createDialog.getByLabel('Size *').selectOption('large');
    await createDialog.getByLabel(/short description/i).fill('Created by an ADS-871 e2e journey.');

    await createDialog.getByRole('button', { name: /^add pet$/i }).click();

    // The modal closes once the create succeeds.
    await expect(createDialog).toBeHidden({ timeout: 20_000 });

    // --- See it in the listing -----------------------------------------
    // Surface the new pet via the page's search filter (URL-driven) so it's on
    // the first page regardless of how many pets the rescue already has.
    await page.goto(`/pets?search=${encodeURIComponent(petName)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { level: 3, name: petName })).toBeVisible({
      timeout: 30_000,
    });

    // --- Edit a field ---------------------------------------------------
    const petCard = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: petName }) })
      .first();
    await petCard.getByRole('button', { name: /^edit$/i }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: /edit pet/i })).toBeVisible({
      timeout: 15_000,
    });

    const newColor = 'Brindle';
    await editDialog.getByLabel(/^color$/i).fill(newColor);
    await editDialog.getByRole('button', { name: /^update pet$/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 20_000 });

    // Reopen the edit modal and confirm the colour persisted.
    await page.goto(`/pets?search=${encodeURIComponent(petName)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    const reopenedCard = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: petName }) })
      .first();
    await reopenedCard.getByRole('button', { name: /^edit$/i }).click();
    const verifyDialog = page.getByRole('dialog');
    await expect(verifyDialog.getByLabel(/^color$/i)).toHaveValue(newColor, { timeout: 15_000 });
  });
});
