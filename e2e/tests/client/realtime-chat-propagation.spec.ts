import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, listChatMessages, postWithCsrf } from '../../helpers/seeds';

/**
 * End-to-end of the messaging path: an adopter posts a message via API
 * and the rescue side picks it up.  Asserted via API on the rescue
 * side because the rescue's /communication page only subscribes to a
 * room after the user opens that thread, so a 30s socket-driven UI
 * wait was unreliable.
 */
test.describe('real-time messaging', () => {
  test('a message posted by the adopter is visible on the rescue side', async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const { chatId } = await getFirstAdopterChat(adopterApi);

    const message = uniqueText('chat-propagation');
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
        { timeout: 15_000, intervals: [200, 500, 1000, 2000] }
      )
      .toBe(true);
  });
});
