import type { Page } from '@playwright/test';

/**
 * Dismiss the cookie-consent banner whenever it shows up on this page. It is
 * fixed to the bottom of the viewport and covers buttons there (the rescue
 * stage modal's Confirm, for one), but whether — and how soon — it renders
 * varies, so don't wait for it: Playwright clicks "Essentials only" before
 * any action the banner would otherwise block.
 *
 * The click is dispatched straight to the button: a page that opens a modal on
 * load (/applications/:id) can put its overlay over the banner first, and a
 * pointer click would then never land.
 */
export async function dismissCookieBannerWhenShown(page: Page): Promise<void> {
  await page.addLocatorHandler(page.getByRole('button', { name: 'Essentials only' }), button =>
    button.dispatchEvent('click')
  );
}
