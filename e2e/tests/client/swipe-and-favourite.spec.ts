import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { deleteWithCsrf, expectOk } from '../../helpers/seeds';

/**
 * The seeders pre-create TWO favourites for John Smith
 * (31-e2e-fixtures.ts).  Test 1 asserts the favourites page surfaces
 * them.  Test 2 deletes one via API and asserts the count drops by one.
 *
 * We deliberately don't go through POST /pets/:id/favorite because
 * the favourite-add code path is currently 500ing on a Postgres ENUM
 * cast inside the Pet read — captured separately as a backend bug.
 * The unfavourite (DELETE) path remains exercised and is the real
 * contract this test pins down.
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

    // Delete the second seeded favourite (pet 756a...).  This leaves
    // the first one (9ff5...) intact for the read test in this file.
    const secondSeededFav = '756ac9c5-ac22-49eb-a21d-8385d525e6de';
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
