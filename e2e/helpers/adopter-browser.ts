import type { Browser, BrowserContext, Page } from '@playwright/test';

import { AUTH_FILES, URLS } from '../playwright.config';

export type AdopterBrowser = { page: Page; context: BrowserContext };

/**
 * Open the client app as the seeded adopter from the saved login (no fresh UI
 * login, which the gateway rate limits). Close the returned context when done.
 */
export async function openAdopterBrowser(
  browser: Browser,
  viewport?: { width: number; height: number }
): Promise<AdopterBrowser> {
  const context = await browser.newContext({
    baseURL: URLS.client,
    storageState: AUTH_FILES.adopter,
    ...(viewport ? { viewport } : {}),
  });
  const page = await context.newPage();
  // The "Maybe Later" prompt can cover the page; dismiss it whenever it shows.
  await page.addLocatorHandler(page.getByRole('button', { name: 'Maybe Later' }), button =>
    button.click()
  );
  return { page, context };
}
