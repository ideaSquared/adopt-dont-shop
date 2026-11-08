import type { BrowserContext, Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { createVerifiedAdopter } from '../../helpers/accounts';
import {
  openOnlyConversation,
  rescueOpensChatForApplication,
} from '../../helpers/application-chat';
import { answerEveryApplicationStep } from '../../helpers/application-form';
import { dismissCookieBannerPatiently } from '../../helpers/cookie-banner-patient';
import { openAccountContext, openRoleContext } from '../../helpers/cross-app-sessions';
import { uniqueText } from '../../helpers/factories';
import { createAvailablePet } from '../../helpers/seeds';
import { skipSwipeIntro } from '../../helpers/swipe-intro';
import { URLS } from '../../playwright.config';

const RAW_ERROR =
  /("error"\s*:|authentication required|invalid token|unauthorized|TypeError|ReferenceError|stack trace|\bat \S+ \(.*:\d+:\d+\))/i;

/** Record every alert/confirm/prompt a page raises, dismissing each. */
function collectDialogs(page: Page, sink: string[]): void {
  page.on('dialog', async dialog => {
    sink.push(`${page.url()} -> ${dialog.message()}`);
    await dialog.dismiss();
  });
}

/** Nothing the payload carried was turned into live markup or ran. */
async function expectPayloadInert(page: Page): Promise<void> {
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);
  expect(await page.evaluate(() => '__xss' in window)).toBe(false);
}

async function send(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: /message input/i });
  await input.fill(text);
  await input.press('Enter');
}

/**
 * X-011: script and HTML payloads typed into the profile name, an application
 * answer and a chat message are shown as plain text everywhere they appear:
 * the client, the rescue's view of the application and chat, and the admin's
 * user list. No dialog fires and nothing is rendered as markup.
 */
test.describe('X-011 script injection in text fields', () => {
  test('payloads in name, answers and chat render as plain text in all three apps', async ({
    browser,
    apiAs,
  }) => {
    test.setTimeout(240_000);

    const marker = uniqueText('xss');
    // Kept under the gateway's 100-character limit on a profile name (longer is a 400).
    const payload = `<img src=x onerror=__xss=1><script>__xss=2</script>${marker}`;
    const rescueApi = await apiAs('rescue');
    const pet = await createAvailablePet(rescueApi, 'X011');
    const account = await createVerifiedAdopter('x011');
    const dialogs: string[] = [];

    const adopterContext = await openAccountContext(browser, account, URLS.client);
    const rescueContext = await openRoleContext(browser, 'rescue');
    const adminContext = await openRoleContext(browser, 'admin');
    const open = async (context: BrowserContext): Promise<Page> => {
      const page = await context.newPage();
      collectDialogs(page, dialogs);
      await skipSwipeIntro(page);
      await dismissCookieBannerPatiently(page);
      return page;
    };
    try {
      const adopter = await open(adopterContext);

      // Client: the profile name.
      await adopter.goto('/profile');
      await expect(adopter.getByRole('heading', { level: 1, name: /my profile/i })).toBeVisible({
        timeout: 15_000,
      });
      await adopter
        .getByRole('button', { name: /edit profile/i })
        .first()
        .click();
      await adopter.getByLabel('First Name').fill(payload);
      await adopter.getByRole('button', { name: /save changes/i }).click();
      await expect(adopter.getByText(/profile updated/i).first()).toBeVisible({ timeout: 15_000 });
      await adopter.goto('/profile');
      await expect(adopter.locator('main').getByText(payload).first()).toBeVisible({
        timeout: 15_000,
      });
      await expectPayloadInert(adopter);

      // Client: an application answer, as the adopter reads it back on the
      // "one last look" step before sending.
      await adopter.goto(`/pets/${pet.petId}`);
      await adopter
        .getByRole('link', { name: /apply (to|for) adopt/i })
        .or(adopter.getByRole('button', { name: /apply (to|for) adopt/i }))
        .first()
        .click();
      await answerEveryApplicationStep(adopter, payload);
      await expect(adopter.getByRole('heading', { name: /one last look/i })).toBeVisible();
      await expect(adopter.locator('main').getByText(payload).first()).toBeVisible();
      await expectPayloadInert(adopter);
      await adopter.getByRole('checkbox', { name: /references have agreed/i }).check();
      await adopter.getByRole('button', { name: /send my application/i }).click();
      await expect(adopter.getByRole('heading', { name: /application sent/i })).toBeVisible({
        timeout: 20_000,
      });

      // Client: a chat message, in the chat the rescue opens about the application.
      await rescueOpensChatForApplication(rescueApi, adopterContext, pet.petId);
      await openOnlyConversation(adopter);
      await send(adopter, payload);
      const sent = adopter.getByRole('article').filter({ hasText: payload });
      await expect(sent).toBeVisible();
      await expect(sent.locator('img, script')).toHaveCount(0);
      await expectPayloadInert(adopter);

      // Rescue: the application's applicant and answers, then the chat.
      const rescue = await open(rescueContext);
      await rescue.goto('/applications');
      const row = rescue.getByRole('row').filter({ hasText: pet.name });
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row.getByText(payload).first()).toBeVisible();
      await row.getByRole('button', { name: 'View' }).click();
      await expect(rescue.getByRole('definition').filter({ hasText: payload }).first()).toBeVisible(
        { timeout: 15_000 }
      );
      await expectPayloadInert(rescue);

      await rescue.goto('/communication');
      await rescue.locator('main').getByRole('button').filter({ hasText: payload }).click();
      const received = rescue.getByRole('article').filter({ hasText: payload });
      await expect(received).toBeVisible({ timeout: 15_000 });
      await expect(received.locator('img, script')).toHaveCount(0);
      await expectPayloadInert(rescue);

      // Admin: the user's name in the list and the detail panel.
      const admin = await open(adminContext);
      await admin.goto('/users');
      await admin.getByRole('textbox', { name: /search by name or email/i }).fill(account.email);
      await expect(admin.getByRole('row')).toHaveCount(2, { timeout: 15_000 });
      const userRow = admin.getByRole('row').filter({ hasText: account.email });
      await expect(userRow.getByText(payload)).toBeVisible();
      await userRow.getByRole('cell').filter({ hasText: account.email }).click();
      await expect(
        admin.getByRole('heading', { level: 3 }).filter({ hasText: payload })
      ).toBeVisible();
      await expectPayloadInert(admin);

      expect(dialogs).toEqual([]);
    } finally {
      await adopterContext.close();
      await rescueContext.close();
      await adminContext.close();
    }
  });
});

/**
 * X-012: the auth cookies vanish mid-session (as if deleted in dev tools). The
 * next action sends the user to sign in with no raw error shown.
 */
test.describe('X-012 session expiry', () => {
  test('the client shows its login prompt when the cookies disappear', async ({ browser }) => {
    const account = await createVerifiedAdopter('x012');
    const context = await openAccountContext(browser, account, URLS.client);
    try {
      const page = await context.newPage();
      await skipSwipeIntro(page);
      await dismissCookieBannerPatiently(page);
      await page.goto('/applications');
      await expect(page.getByRole('heading', { level: 1, name: /my applications/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('button', { name: /user menu for E2E Adopter/i })).toBeVisible();

      await context.clearCookies();
      await page
        .getByRole('link', { name: /favorites/i })
        .first()
        .click();

      await expect(page.getByRole('heading', { name: 'Login Required' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('link', { name: /sign in to view favorites/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /user menu for/i })).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText(RAW_ERROR);
    } finally {
      await context.close();
    }
  });

  test('the rescue app sends the user to its sign-in page', async ({ browser }) => {
    const context = await openRoleContext(browser, 'rescue');
    try {
      const page = await context.newPage();
      await dismissCookieBannerPatiently(page);
      await page.goto('/pets');
      await expect(page.getByRole('heading', { name: 'Pet Management' })).toBeVisible({
        timeout: 15_000,
      });

      await context.clearCookies();
      await page.getByRole('link', { name: 'Applications', exact: true }).click();

      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Rescue Staff Sign In' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(RAW_ERROR);
    } finally {
      await context.close();
    }
  });

  test('the admin app sends the user to its sign-in page', async ({ browser }) => {
    const context = await openRoleContext(browser, 'admin');
    try {
      const page = await context.newPage();
      await dismissCookieBannerPatiently(page);
      await page.goto('/users');
      await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible({
        timeout: 30_000,
      });

      await context.clearCookies();
      await page.getByRole('link', { name: 'Rescues', exact: true }).click();

      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: /user management|rescue management/i })
      ).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(RAW_ERROR);
    } finally {
      await context.close();
    }
  });
});
