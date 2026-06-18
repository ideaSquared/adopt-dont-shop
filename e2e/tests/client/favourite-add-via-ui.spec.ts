import { test, expect } from '../../fixtures';
import { petCardLocator } from '../../helpers/pet';
import { createAvailablePet } from '../../helpers/seeds';

/**
 * UI-level coverage for ADDING a favourite (POST /api/v1/pets/:id/favorite).
 *
 * swipe-and-favourite.spec.ts covers the read (seeded favourites display) and
 * the API remove. This spec proves the adopter can ADD a favourite through the
 * UI: the pet detail page's "Add to Favorites" control is wired to
 * petService.addToFavorites, and the pet then shows on /favorites.
 *
 * We favourite a FRESH pet (not a seeded one) because John Smith already has
 * Buddy + Luna seeded as favourites — a fresh pet guarantees the control starts
 * in the un-favourited state so the add is observable.
 */
test.describe('add a favourite via the UI', () => {
  test('favouriting a pet on its detail page surfaces it on /favorites', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const { petId, name } = await createAvailablePet(rescueApi, 'FavUi');

    await page.goto(`/pets/${petId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });

    const addButton = page.getByRole('button', { name: /add to favorites/i });
    await expect(addButton).toBeVisible({ timeout: 20_000 });
    await addButton.click();

    // The button flips to the favourited state once the POST resolves.
    await expect(page.getByRole('button', { name: /favorited/i })).toBeVisible({ timeout: 15_000 });

    // And the pet now appears on the favourites page.
    await page.goto('/favorites', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(petCardLocator(page).filter({ hasText: name })).toBeVisible({ timeout: 20_000 });
  });
});
