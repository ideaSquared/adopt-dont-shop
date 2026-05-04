import { expect, request as playwrightRequest, type Locator, type Page } from '@playwright/test';
import { URLS } from '../playwright.config';

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
 * Find the ID of an available pet via the public API.  Returns null if the
 * catalogue has no available pets — in which case the calling test should
 * skip rather than fail.
 */
export async function findAvailablePetId(): Promise<string | null> {
  const ctx = await playwrightRequest.newContext({ baseURL: URLS.api });
  try {
    const response = await ctx.get('/api/v1/pets', {
      params: { status: 'available', limit: '5' },
    });
    if (!response.ok()) {
      return null;
    }
    const body = (await response.json()) as { data?: unknown[]; pets?: unknown[] };
    const list = (body.data ?? body.pets ?? []) as Array<{
      petId?: string;
      id?: string;
      pet_id?: string;
    }>;
    for (const pet of list) {
      const id = pet.petId ?? pet.id ?? pet.pet_id;
      if (id) {
        return id;
      }
    }
    return null;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Open a *known available* pet's detail page.  We deliberately don't go
 * through /search and click the first card, because the first card may be
 * any status — and tests that need to drive the apply flow require an
 * available pet specifically.
 */
export async function openAvailablePet(page: Page): Promise<string> {
  const id = await findAvailablePetId();
  if (!id) {
    throw new Error('no available pets in the seed set');
  }
  await page.goto(`/pets/${id}`);
  await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
  return id;
}

/**
 * Open the first pet detail page from /search.  Use this when the test
 * doesn't care whether the pet is available — e.g. just verifying the
 * card-click → detail-page navigation.
 *
 * The PetCard renders <Card role="link"> with hover-driven CSS
 * transforms, which can make Playwright's click stability check time
 * out under cold-compile load — fall back to navigating via the API.
 */
export async function openFirstPet(page: Page): Promise<void> {
  const id = await findAvailablePetId();
  if (id) {
    await page.goto(`/pets/${id}`);
    await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
    return;
  }
  await gotoSearch(page);
  const card = petCardLocator(page).first();
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  await card.click({ force: true });
  await expect(page).toHaveURL(/\/pets\//, { timeout: 15_000 });
}

export async function favouriteCurrentPet(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /(favourite|favorite|save)/i })
    .first()
    .click();
}
