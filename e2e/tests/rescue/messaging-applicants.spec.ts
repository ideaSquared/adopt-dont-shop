import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { getFirstAdopterChat, postWithCsrf } from '../../helpers/seeds';

test.describe('rescue messaging', () => {
  test('a rescue staffer can send a message via API to a seeded chat', async ({ apiAs }) => {
    const adopterApi = await apiAs('adopter');
    const rescueApi = await apiAs('rescue');
    const { chatId } = await getFirstAdopterChat(adopterApi);

    const message = uniqueText('rescue-reply');
    const sendRes = await postWithCsrf(rescueApi.context, `/api/v1/chats/${chatId}/messages`, {
      content: message,
      messageType: 'text',
    });
    expect(sendRes.ok()).toBe(true);

    // Verify via API that the message persisted on the thread.
    const listRes = await adopterApi.context.get(`/api/v1/chats/${chatId}/messages`, {
      params: { limit: '20' },
    });
    expect(listRes.ok()).toBe(true);
    const body = (await listRes.json()) as {
      data?: Array<{ content?: string }>;
      messages?: Array<{ content?: string }>;
    };
    const messages = body.data ?? body.messages ?? [];
    expect(messages.some(m => m.content === message)).toBe(true);
  });
});
