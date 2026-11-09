import { expect, type Browser } from '@playwright/test';

import { URLS } from '../playwright.config';
import { dismissCookieBannerWhenShown } from './cookie-banner';
import { peekAuthTokens } from './token-peek';

/**
 * Follow the link a pending email change sends to the new address. The token
 * is read through the peek seam by the account's CURRENT email (the address
 * only moves once confirmed). The confirm page lives in app.client for every
 * user type; it is opened in a fresh browser, as from the new inbox, and
 * confirms only on a click.
 */
export async function confirmEmailChangeFromLink(
  browser: Browser,
  currentEmail: string
): Promise<void> {
  const { emailChangeToken } = await peekAuthTokens(currentEmail);
  expect(emailChangeToken, `no email-change token outstanding for ${currentEmail}`).toBeTruthy();
  const context = await browser.newContext({ baseURL: URLS.client });
  try {
    const page = await context.newPage();
    await dismissCookieBannerWhenShown(page);
    await page.goto(`/confirm-email-change?token=${encodeURIComponent(emailChangeToken ?? '')}`);
    await page.getByRole('button', { name: 'Confirm new email' }).click();
    await expect(page.getByRole('heading', { name: 'Email changed' })).toBeVisible();
  } finally {
    await context.close();
  }
}
