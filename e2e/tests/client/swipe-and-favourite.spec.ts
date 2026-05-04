import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { SEEDED_PET_IDS, deleteWithCsrf, expectOk, favouritePet } from '../../helpers/seeds';

/**
 * The seeders guarantee John Smith has at least one favourited pet
 * (31-e2e-fixtures.ts).  Test 1 asserts the favourites page surfaces it.
 * Test 2 favourites + unfavourites a different pet via API and asserts
 * disappearance, so it doesn't break Test 1.
 */
test.describe('favourites', () => {
  test('a seeded favourite shows on the favourites page', async ({ page }) => {
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

    await favouritePet(adopterApi, SEEDED_PET_IDS.pending);

    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const initialCount = await petCardLocator(page).count();
    expect(initialCount).toBeGreaterThan(0);

    const removeRes = await deleteWithCsrf(
      adopterApi.context,
      `/api/v1/pets/${SEEDED_PET_IDS.pending}/favorite`
    );
    await expectOk(removeRes, `DELETE /pets/${SEEDED_PET_IDS.pending}/favorite`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => await petCardLocator(page).count(), { timeout: 15_000 })
      .toBeLessThan(initialCount);
  });
});
