import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { dismissCookieBannerWhenShown } from '../../helpers/cookie-banner';
import { uniqueText } from '../../helpers/factories';

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
});
