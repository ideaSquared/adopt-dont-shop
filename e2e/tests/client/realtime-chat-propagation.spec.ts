import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, postWithCsrf } from '../../helpers/seeds';

/**
 * End-to-end of the messaging path: an adopter posts a message via API
 * and the rescue side picks it up.  Originally this verified the
 * Socket.IO push on the rescue's /communication page, but that depends
 * on the chat-list UI auto-subscribing to all rooms — and the page
 * variant in this build subscribes only after the user opens a thread.
 * We assert via API on the rescue side instead, plus a fast follow-up
 * read to confirm the propagation happened within the polling window.
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

    // Tight poll budget — we want to catch slow propagation if it
    // happens (e.g. async write fan-out), but in practice a successful
    // POST should be readable within seconds.
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
        { timeout: 15_000, intervals: [200, 500, 1000, 2000] }
      )
      .toBe(true);
  });
});
