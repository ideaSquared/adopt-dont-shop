import type { Page } from '@playwright/test';

/**
 * Like `dismissCookieBannerWhenShown`, but tolerant of a slow consent save.
 *
 * Signed in, "Essentials only" disables itself until the consent request to
 * the gateway returns, and the banner stays up (covering the bottom of the
 * page) until then. Under a loaded stack that outlasts the 10s action timeout.
 * Time spent inside a locator handler counts against the action it intercepted,
 * so waiting for the banner to go away in here cannot help. Instead the handler
 * clicks (the choice is stored locally the moment the button is pressed) and
 * then takes the banner out of the layout itself, so nothing is left covering
 * the page while the consent request finishes in the background.
 */
export async function dismissCookieBannerPatiently(page: Page): Promise<void> {
  const essentialsOnly = page.getByRole('button', { name: 'Essentials only' });
  await page.addLocatorHandler(
    essentialsOnly,
    async button => {
      if (await button.isEnabled()) {
        // On a phone-width signed-in page the bottom tab bar can sit over the banner and
        // swallow the click; fall back to dispatching the click on the button itself.
        await button.click({ timeout: 2_000 }).catch(() => button.dispatchEvent('click'));
      }
      // Not through `button`: a quick consent save can unmount it already.
      await page.evaluate(() => {
        const banner = document.querySelector<HTMLElement>('[data-testid="cookie-banner"]');
        if (banner) {
          banner.style.display = 'none';
        }
      });
    },
    { noWaitAfter: true }
  );
}
