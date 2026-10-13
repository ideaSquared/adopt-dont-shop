import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { URLS } from '../../playwright.config';
import { createVerifiedAdopter, loginAccountViaApi } from '../../helpers/accounts';
import { loginViaUI } from '../../helpers/auth';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';
import { createAdopterApplication, expectOk, postWithCsrf } from '../../helpers/seeds';

/**
 * Adopter and rescue talk through the chat UIs of both apps.
 *
 * adopter-rescue-chat.spec.ts and realtime-chat-propagation.spec.ts post and
 * read messages through the API. In the browser the chat had never worked:
 * lib.chat expected `{ id, participants, lastMessage }` conversations and
 * `{ id, senderId, timestamp }` messages but the gateway serves the chat
 * service's `{ chatId, participantUserIds }` / `{ messageId, senderUserId,
 * body }` shapes, so opening a conversation requested `/chats//messages`; and
 * it listened for a `new_message` socket event the gateway never emits
 * (`chat:message:created`).
 */
async function openFirstConversation(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await dismissCookieBannerWhenShown(page);
  const conversations = page.locator('main').getByRole('button', { name: /rescue organization/i });
  await conversations.first().click();
  await expect(page.getByRole('textbox', { name: /message input/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function send(page: Page, text: string): Promise<void> {
  const input = page.getByRole('textbox', { name: /message input/i });
  await input.fill(text);
  await input.press('Enter');
}

test.describe('chat in the UI', () => {
  test('an adopter messages the rescue and sees the reply arrive live @smoke', async ({
    page,
    asRole,
  }) => {
    const question = uniqueText('Is she good with cats?');
    const reply = uniqueText('Yes, she lives with two');

    await openFirstConversation(page, '/chat');
    await send(page, question);
    await expect(page.getByRole('article').filter({ hasText: question })).toBeVisible();

    const rescuePage = await asRole('rescue');
    await openFirstConversation(rescuePage, '/communication');
    await expect(rescuePage.getByRole('article').filter({ hasText: question })).toBeVisible({
      timeout: 15_000,
    });
    await send(rescuePage, reply);

    // No reload: the reply reaches the adopter over the socket.
    await expect(page.getByRole('article').filter({ hasText: reply })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a rescue message the adopter hasn't read shows as unread until they open it", async ({
    browser,
    apiAs,
  }) => {
    // A fresh adopter and chat, so messages other specs post to the seeded
    // chat can't change the count under this test.
    const account = await createVerifiedAdopter('unread');
    const adopterApi = await loginAccountViaApi(account);
    const rescueApi = await apiAs('rescue');
    const { applicationId } = await createAdopterApplication(adopterApi, rescueApi);

    const openRes = await postWithCsrf(rescueApi.context, '/api/v1/chats', {
      applicationId,
      otherUserId: adopterApi.userId,
    });
    await expectOk(openRes, 'rescue opens a chat with the applicant');
    const { chat } = (await openRes.json()) as { chat: { chatId: string } };
    const sendRes = await postWithCsrf(rescueApi.context, `/api/v1/chats/${chat.chatId}/messages`, {
      content: uniqueText('We would love to meet you'),
      messageType: 'text',
    });
    await expectOk(sendRes, 'rescue sends a message');
    await adopterApi.dispose();

    // Contexts opened in a test inherit the project's storageState (the seeded
    // adopter); start this one signed out.
    const context = await browser.newContext({
      baseURL: URLS.client,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    try {
      await loginViaUI(page, account.email, account.password);
      await page.goto('/chat');
      await dismissCookieBannerWhenShown(page);
      const conversation = page
        .locator('main')
        .getByRole('button', { name: /rescue organization/i })
        .first();
      await expect(conversation).toHaveAccessibleName(/1 unread message$/, { timeout: 15_000 });

      const markedRead = page.waitForResponse(
        res => res.url().endsWith(`/chats/${chat.chatId}/read`) && res.ok()
      );
      await conversation.click();
      await markedRead;

      await page.reload();
      await expect(conversation).toBeVisible({ timeout: 15_000 });
      await expect(conversation).not.toHaveAccessibleName(/unread/);
    } finally {
      await context.close();
    }
  });
});
