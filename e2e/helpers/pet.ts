import { expect, type Page } from '@playwright/test';

export async function gotoDiscover(page: Page): Promise<void> {
  await page.goto('/discover');
  await expect(page).toHaveURL(/\/discover/);
}

export async function gotoSearch(page: Page): Promise<void> {
  await page.goto('/search');
  await expect(page).toHaveURL(/\/search/);
}

/**
 * Searches for pets by free-text query. Falls back across common search-input
 * conventions (placeholder text, aria-label, role=searchbox) so the helper
 * survives small UI changes.
 */
export async function searchForPet(page: Page, query: string): Promise<void> {
  await gotoSearch(page);
  const searchInput = page
    .getByRole('searchbox')
    .or(page.getByPlaceholder(/search/i))
    .or(page.getByLabel(/search/i))
    .first();
  await searchInput.fill(query);
  await searchInput.press('Enter');
}

/** Opens the first pet card visible on the current page. */
export async function openFirstPet(page: Page): Promise<void> {
  const firstCard = page
    .getByRole('article')
    .or(page.getByRole('link', { name: /view (pet|details)/i }))
    .or(page.locator('[data-testid="pet-card"]'))
    .first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/pets\//);
}

export async function favouriteCurrentPet(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /(favourite|favorite|save)/i })
    .first()
    .click();
}
