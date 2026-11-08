import type { Page } from '@playwright/test';

/**
 * A first-time visitor gets a "Meet Your New Favorite Feature" modal about a
 * second after any app-shell page loads, which hides the page from the
 * accessibility tree and covers the cookie banner. Mark it as already seen
 * before the app boots so specs on a fresh (signed-out) context aren't racing it.
 */
export async function skipSwipeIntro(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('hasSeenSwipeOnboarding', 'true');
    } catch {
      // Storage unavailable: the modal may show; nothing more to do.
    }
  });
}
