import { test, expect } from '../../fixtures';
import { createAvailablePet } from '../../helpers/seeds';

/**
 * The canonical "only e2e can prove this" check: a NEW pet published by
 * a rescue staffer through the API surfaces in the adopter's search
 * results.  This test specifically needs uniqueness — it's verifying
 * write→read propagation, so the seed alone can't cover it.
 */
test.describe('cross-app data flow', () => {
  test('a pet published by the rescue is visible to an adopter searching for it', async ({
    page,
    apiAs,
  }) => {
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'Crossapp');

    await page.goto('/search');
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/^search$/i))
      .first();
    await searchInput.fill(pet.name);
    await searchInput.press('Enter');

    await expect(page.getByText(pet.name).first()).toBeVisible({ timeout: 20_000 });
  });
});
