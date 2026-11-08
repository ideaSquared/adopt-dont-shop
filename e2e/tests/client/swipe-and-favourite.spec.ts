import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { createAvailablePet, deleteWithCsrf, expectOk, favouritePet } from '../../helpers/seeds';

/**
 * The pets seed (services/pets/src/db/seed.ts → SEED_FAVORITES) pre-creates
 * TWO favourites for John Smith. Test 1 asserts the favourites page surfaces
 * them. Test 2 favourites a fresh pet, deletes it via DELETE /pets/:id/favorite
 * and asserts it leaves the page (no seeded ids involved). The list, status and add/remove favourite routes are all wired
 * in services/gateway/src/routes/pets.ts onto the pets service's
 * user-favourites RPCs.
 */
test.describe('favourites', () => {
  test('seeded favourites show on the favourites page', async ({ page }) => {
    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
  });

  test('unfavouriting a pet via API removes it from the favourites page', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const { petId, name } = await createAvailablePet(rescueApi, 'SwipeFav');
    // A favourite that stays: seeing it proves the list has loaded, so the removed
    // pet's absence is not just the page still waiting for its request.
    const keeper = await createAvailablePet(rescueApi, 'SwipeKeep');
    await favouritePet(adopterApi, petId);
    await favouritePet(adopterApi, keeper.petId);

    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(petCardLocator(page).filter({ hasText: name })).toBeVisible({ timeout: 20_000 });

    const removeRes = await deleteWithCsrf(adopterApi.context, `/api/v1/pets/${petId}/favorite`);
    await expectOk(removeRes, `DELETE /pets/${petId}/favorite`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(petCardLocator(page).filter({ hasText: keeper.name })).toBeVisible({
      timeout: 20_000,
    });
    await expect(petCardLocator(page).filter({ hasText: name })).toHaveCount(0);
  });
});
