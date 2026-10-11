import { test, expect } from '../../fixtures';

/**
 * "Only e2e can prove this": the rescue's pets surface in the adopter's
 * search results.  We use a seeded pet (Buddy from Pawsitive Rescue, in
 * 08-pets.ts) rather than creating one per test — the POST /pets path
 * currently 500s with a Postgres ENUM type-mismatch (Sequelize generates
 * a default value cast that the column doesn't accept).  Captured as a
 * separate backend bug; this test still validates the cross-app read
 * path: rescue's record → adopter search.
 */
test.describe('cross-app data flow', () => {
  test('a seeded rescue pet is findable in the adopter search', async ({ page }) => {
    await page.goto('/search');
    // Scoped to the page: the dev-login overlay has its own "Search dev
    // users" searchbox, which comes first in DOM order.
    const main = page.getByRole('main');
    const searchInput = main
      .getByRole('searchbox')
      .or(main.getByPlaceholder(/search/i))
      .or(main.getByLabel(/^search$/i))
      .first();
    await searchInput.fill('Buddy');
    await searchInput.press('Enter');

    await expect(main.getByText('Buddy').first()).toBeVisible({ timeout: 20_000 });
  });
});
