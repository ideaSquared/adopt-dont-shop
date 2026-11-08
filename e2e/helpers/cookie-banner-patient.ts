import { expect, type Page } from '@playwright/test';

const BANNER_SETTLE_TIMEOUT_MS = 45_000;

/**
 * Like `dismissCookieBannerWhenShown`, but tolerant of a slow consent save.
 *
 * Signed in, "Essentials only" disables itself until the consent request to
 * the gateway returns, and the banner stays up (covering the bottom of the
 * page) until then. Under a loaded dev stack that outlasts the 10s action
 * timeout, so the shared helper can leave the action it intercepted timing
 * out. This one clicks, then waits for the banner to go away without
 * holding the intercepted action to its own timeout.
 */
export async function dismissCookieBannerPatiently(page: Page): Promise<void> {
  const essentialsOnly = page.getByRole('button', { name: 'Essentials only' });
  await page.addLocatorHandler(
    essentialsOnly,
    async button => {
      if (await button.isEnabled()) {
        // The bottom tab bar can sit over the banner at phone width and swallow the click.
        await button.click({ timeout: 2_000 }).catch(() => button.dispatchEvent('click'));
      }
      await expect(button).toBeHidden({ timeout: BANNER_SETTLE_TIMEOUT_MS });
    },
    { noWaitAfter: true }
  );
}
