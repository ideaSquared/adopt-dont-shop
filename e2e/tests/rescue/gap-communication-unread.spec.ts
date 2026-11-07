import type { Browser, BrowserContext, Page } from '@playwright/test';

import { test, expect, type ApiClient } from '../../fixtures';
import { createVerifiedAdopter, loginAccountViaApi, type Account } from '../../helpers/accounts';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { openAccountContext } from '../../helpers/cross-app-sessions';
import { uniqueText } from '../../helpers/factories';
import { createPrivateConversation } from '../../helpers/private-conversation';
import { expectOk, postWithCsrf } from '../../helpers/seeds';
import { createRescueWithOwner } from '../../helpers/throwaway-rescue';
import { URLS } from '../../playwright.config';

/**
 * RES-061: when an adopter messages a rescue, the rescue app's Messages link
 * shows an unread badge, and the badge clears once the conversation is opened.
 *
 * Each test runs on a rescue of its own, so the count starts at zero and holds
 * only what the test sends.
 */
type Scenario = {
  rescuePage: Page;
  message: string;
  close: () => Promise<void>;
};

// The sidebar's Messages link; its badge adds "N unread message(s)" to the link's name.
const messagesLink = (page: Page, unread?: string) =>
  page.getByRole('link', { name: unread ? `Messages ${unread}` : 'Messages', exact: true });

const communicationLoaded = (page: Page) =>
  expect(page.getByRole('heading', { name: 'Communication', exact: true })).toBeVisible({
    timeout: 30_000,
  });

const openConversation = async (page: Page, message: string): Promise<void> => {
  await page.locator('main').getByRole('button').filter({ hasText: message }).click();
  await expect(page.getByRole('article').filter({ hasText: message })).toBeVisible({
    timeout: 15_000,
  });
};

const withApiLogin = async <T>(
  account: Account,
  fn: (api: ApiClient) => Promise<T>
): Promise<T> => {
  const api = await loginAccountViaApi(account);
  try {
    return await fn(api);
  } finally {
    await api.dispose();
  }
};

// A rescue with no messages, watched in its own app, then one message from an adopter.
// The rescue opens the conversation (as it does from an application) and the adopter
// replies through the API: the pet-enquiry button is capped at 10 a day per IP, a
// budget the shared stack has already spent.
const adopterMessagesTheRescue = async (
  browser: Browser,
  adminApi: ApiClient
): Promise<Scenario> => {
  const rescue = await createRescueWithOwner(adminApi, 'Unread');
  const adopter = await createVerifiedAdopter('res061');
  const message = uniqueText('Is she house trained?');
  await withApiLogin(rescue.owner, ownerApi =>
    withApiLogin(adopter, async adopterApi => {
      const { chatId } = await createPrivateConversation(adopterApi, ownerApi);
      await expectOk(
        await postWithCsrf(adopterApi.context, `/api/v1/chats/${chatId}/messages`, {
          content: message,
          messageType: 'text',
        }),
        'adopter sends a message'
      );
    })
  );
  const rescueContext: BrowserContext = await openAccountContext(
    browser,
    rescue.owner,
    URLS.rescue
  );
  const rescuePage = await rescueContext.newPage();
  await dismissCookieBannerWhenShown(rescuePage);
  await rescuePage.goto('/communication');
  await communicationLoaded(rescuePage);

  return { rescuePage, message, close: () => rescueContext.close() };
};

test.describe('unread messages in the rescue app', () => {
  // Creating a rescue accepts an invitation, which the gateway rate limits
  // (10 a minute per IP, shared with every other spec); a retry can wait out the window.
  test.describe.configure({ timeout: 180_000 });

  test('RES-061: an adopter message shows an unread badge that clears once it is opened', async ({
    browser,
    apiAs,
  }) => {
    const { rescuePage, message, close } = await adopterMessagesTheRescue(
      browser,
      await apiAs('admin')
    );
    try {
      // The rescue's Messages link shows one unread message.
      await expect(messagesLink(rescuePage, '1 unread message')).toBeVisible({ timeout: 30_000 });

      // Opening the conversation clears it.
      await openConversation(rescuePage, message);
      await expect(messagesLink(rescuePage)).toBeVisible();
    } finally {
      await close();
    }
  });

  // App bug: opening the conversation only clears the badge in the open page.
  // The rescue's read is not saved, so the same message counts as unread again
  // after a reload. Remove test.fail once reading a conversation is persisted.
  test.fail(
    'RES-061: a message that was opened stays read after a reload',
    async ({ browser, apiAs }) => {
      const { rescuePage, message, close } = await adopterMessagesTheRescue(
        browser,
        await apiAs('admin')
      );
      try {
        await rescuePage.reload();
        await expect(messagesLink(rescuePage, '1 unread message')).toBeVisible({ timeout: 30_000 });
        await openConversation(rescuePage, message);
        await expect(messagesLink(rescuePage)).toBeVisible();

        await rescuePage.reload();

        // The conversation list has loaded again, so its unread count has too.
        await communicationLoaded(rescuePage);
        await expect(
          rescuePage.locator('main').getByRole('button').filter({ hasText: message })
        ).toBeVisible({ timeout: 30_000 });
        await expect(messagesLink(rescuePage)).toBeVisible();
      } finally {
        await close();
      }
    }
  );
});
