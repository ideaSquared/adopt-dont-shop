import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, postWithCsrf } from '../../helpers/seeds';

test.describe('chat between adopter and rescue', () => {
  test('a message sent by the adopter shows up in the rescue staff inbox', async ({
    apiAs,
    asRole,
  }) => {
    const adopterApi = await apiAs('adopter');
    const { chatId } = await getFirstAdopterChat(adopterApi);

    // Open the rescue's communication page first so any live socket
    // subscription is in place when the message lands.
    const rescuePage = await asRole('rescue');
    await rescuePage.goto('/communication', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(rescuePage.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    const message = uniqueText('hello');
    const sendRes = await postWithCsrf(adopterApi.context, `/api/v1/chats/${chatId}/messages`, {
      content: message,
      messageType: 'text',
    });
    await expectOk(sendRes, `POST /api/v1/chats/${chatId}/messages`);

    await expect(rescuePage.getByText(message).first()).toBeVisible({ timeout: 30_000 });
  });
});
