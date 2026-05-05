import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, listChatMessages, postWithCsrf } from '../../helpers/seeds';

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
    await expectOk(sendRes, `POST /api/v1/chats/${chatId}/messages (as rescue)`);

    const messages = await listChatMessages(adopterApi.context, chatId);
    expect(messages.some(m => m.content === message)).toBe(true);
  });
});
