import { test, expect } from '../../fixtures';
import { gotoSearch } from '../../helpers/pet';

test.describe('pet discovery', () => {
  test('an adopter sees a populated list of pets on /discover', async ({ page }) => {
    await page.goto('/discover');
    const cards = page.getByRole('article').or(page.locator('[data-testid="pet-card"]'));
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('searching with a known seeded query yields results', async ({ page }) => {
    await gotoSearch(page);
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    await searchInput.fill('dog');
    await searchInput.press('Enter');

    const results = page.getByRole('article').or(page.locator('[data-testid="pet-card"]'));
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });

  test('searching with nonsense text shows an empty state, not a crash', async ({ page }) => {
    await gotoSearch(page);
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    await searchInput.fill('zzzzz-no-pet-named-this-xyzqq');
    await searchInput.press('Enter');

    await expect(
      page.getByText(/(no (pets|results)|nothing found|try (different|broader))/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
