import { test, expect } from '../../fixtures';
import { gotoSearch, petCardLocator } from '../../helpers/pet';

test.describe('pet discovery', () => {
  test('an adopter sees a populated list of pets on /search', async ({ page }) => {
    await gotoSearch(page);
    const cards = petCardLocator(page);
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('searching with a known seeded query yields results', async ({ page }) => {
    await gotoSearch(page);
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/^search$/i))
      .first();
    await searchInput.fill('dog');
    await searchInput.press('Enter');

    const results = petCardLocator(page);
    await expect(results.first()).toBeVisible({ timeout: 20_000 });
  });

  test('searching with nonsense text shows the "No pets match" empty state and no pet cards', async ({
    page,
  }) => {
    await gotoSearch(page);
    await expect(petCardLocator(page).first()).toBeVisible({ timeout: 20_000 });

    // The dev-login panel has its own searchbox, so address the pet search by its placeholder.
    const searchInput = page.getByPlaceholder('Search by name, breed, or description...');
    await searchInput.fill('zzzzz-no-pet-named-this-xyzqq');
    // Enter does not submit this form; the Search button runs the query.
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'No pets match your filters' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/try broadening your search/i)).toBeVisible();
    await expect(petCardLocator(page)).toHaveCount(0);
    // The page is still the search page, not an error screen.
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});
