import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { deleteWithCsrf, expectOk } from '../../helpers/seeds';

/**
 * The pets seed (services/pets/src/db/seed.ts → SEED_FAVORITES) pre-creates
 * TWO favourites for John Smith — Buddy (available) and Luna (pending).
 * Test 1 asserts the favourites page surfaces them. Test 2 deletes one via
 * the DELETE /pets/:id/favorite gateway route and asserts the count drops
 * by one. The list, status and add/remove favourite routes are all wired
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

    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // Wait for at least one card to render before reading the count —
    // the page hydrates the favourites list async, and grabbing the
    // count too eagerly returns 0.
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });
    const initialCount = await petCardLocator(page).count();
    expect(initialCount).toBeGreaterThan(0);

    // Delete the second seeded favourite (Luna, a1d1...).  This leaves
    // the first one (Buddy, 9ff5...) intact for the read test in this file.
    const secondSeededFav = 'a1d109eb-e717-44a0-aed7-c7c0af6c152f';
    const removeRes = await deleteWithCsrf(
      adopterApi.context,
      `/api/v1/pets/${secondSeededFav}/favorite`
    );
    await expectOk(removeRes, `DELETE /pets/${secondSeededFav}/favorite`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => await petCardLocator(page).count(), { timeout: 15_000 })
      .toBeLessThan(initialCount);
  });
});
