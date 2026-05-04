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

  test('searching with nonsense text shows an empty state, not a crash', async ({ page }) => {
    await gotoSearch(page);
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .or(page.getByLabel(/^search$/i))
      .first();
    await searchInput.fill('zzzzz-no-pet-named-this-xyzqq');
    await searchInput.press('Enter');

    // Either an explicit empty state, or simply no pet cards rendered, but
    // the page must still be alive — the h1 stays mounted.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});
