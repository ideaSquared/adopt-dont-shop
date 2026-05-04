import { expect, type Locator, type Page } from '@playwright/test';

export async function gotoDiscover(page: Page): Promise<void> {
  await page.goto('/discover');
  await expect(page).toHaveURL(/\/discover/);
}

export async function gotoSearch(page: Page): Promise<void> {
  await page.goto('/search');
  await expect(page).toHaveURL(/\/search/);
}

/**
 * PetCard renders <Card role="link"><h3>{name}</h3>...</Card> — not <article>.
 * Filter role=link by "has a level-3 heading" so we don't accidentally match
 * navigation links.
 */
export function petCardLocator(page: Page): Locator {
  return page
    .locator('[data-testid="pet-card"]')
    .or(page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) }))
    .or(page.getByRole('article'));
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

/**
 * Open the first pet detail page. /search renders a grid of cards (good for
 * picking one); /discover uses a swipe deck (one card at a time). We go
 * through /search so the locator semantics are stable.
 */
export async function openFirstPet(page: Page): Promise<void> {
  await gotoSearch(page);
  const card = petCardLocator(page).first();
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  await card.click();
  await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
}

export async function favouriteCurrentPet(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /(favourite|favorite|save)/i })
    .first()
    .click();
}
