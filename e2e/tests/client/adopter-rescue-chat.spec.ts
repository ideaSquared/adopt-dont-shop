import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, listChatMessages, postWithCsrf } from '../../helpers/seeds';

/**
 * Adopter posts a message via API; the rescue side can read it back.
 * We verify the cross-app contract through the API rather than waiting
 * for a Socket.IO push to render on a /communication page — the live
 * push depends on the rescue's chat-list UI auto-subscribing, which
 * isn't always the case (the page may require navigating into a
 * specific thread first to subscribe).  The API read is what matters
 * for "the message reached the rescue".
 */
test.describe('chat between adopter and rescue', () => {
  test('a message sent by the adopter is readable on the rescue side', async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const { chatId } = await getFirstAdopterChat(adopterApi);

    const message = uniqueText('hello');
    const sendRes = await postWithCsrf(adopterApi.context, `/api/v1/chats/${chatId}/messages`, {
      content: message,
      messageType: 'text',
    });
    await expectOk(sendRes, `POST /api/v1/chats/${chatId}/messages`);

    await expect
      .poll(
        async () => {
          const messages = await listChatMessages(rescueApi.context, chatId);
          return messages.some(m => m.content === message);
        },
        { timeout: 15_000 }
      )
      .toBe(true);
  });
});
