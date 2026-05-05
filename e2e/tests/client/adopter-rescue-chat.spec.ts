import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, postWithCsrf } from '../../helpers/seeds';

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

    // Read the message list as the rescue user — the message must be
    // present.  This validates participant scoping (rescue is in the
    // chat) and message persistence end-to-end.
    await expect
      .poll(
        async () => {
          const res = await rescueApi.context.get(`/api/v1/chats/${chatId}/messages`, {
            params: { limit: '20' },
          });
          if (!res.ok()) {
            return null;
          }
          const body = (await res.json()) as {
            data?: Array<{ content?: string }>;
            messages?: Array<{ content?: string }>;
          };
          const messages = body.data ?? body.messages ?? [];
          return messages.some(m => m.content === message);
        },
        { timeout: 15_000 }
      )
      .toBe(true);
  });
});
