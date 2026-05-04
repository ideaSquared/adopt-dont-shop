import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { SEEDED_PET_IDS, deleteWithCsrf, favouritePet } from '../../helpers/seeds';

/**
 * The seeders guarantee John Smith has at least one favourited pet
 * (31-e2e-fixtures.ts).  Test 1 asserts the favourites page surfaces it.
 * Test 2 deletes a favourite via API and asserts disappearance.
 */
test.describe('favourites', () => {
  test('a seeded favourite shows on the favourites page', async ({ page }) => {
    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/favorites/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });

    // At least one pet card on the page.
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
  });

  test('unfavouriting a pet via API removes it from the favourites page', async ({
    page,
    apiAs,
  }) => {
    const adopterApi = await apiAs('adopter');

    // Use a *different* pet than the seeded favourite so we don't break
    // other tests in the same run.  Favourite a fresh available pet,
    // verify on the page, then unfavourite.
    await favouritePet(adopterApi, SEEDED_PET_IDS.pending);

    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const initialCount = await petCardLocator(page).count();
    expect(initialCount).toBeGreaterThan(0);

    const removeRes = await deleteWithCsrf(
      adopterApi.context,
      `/api/v1/pets/${SEEDED_PET_IDS.pending}/favorite`
    );
    expect(removeRes.ok()).toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    // Either fewer cards, or the page transitions to empty state.  Both
    // satisfy "the unfavourite happened".
    await expect
      .poll(async () => await petCardLocator(page).count(), { timeout: 15_000 })
      .toBeLessThan(initialCount);
  });
});
