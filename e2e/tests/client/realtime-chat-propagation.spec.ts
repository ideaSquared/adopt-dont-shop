import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';
import { expectOk, getFirstAdopterChat, postWithCsrf } from '../../helpers/seeds';

/**
 * End-to-end of the live messaging path: an adopter posts a message
 * via API and the rescue's communication page receives it within the
 * Socket.IO push window.  Catches breakage in any of: Socket.IO setup,
 * room subscription on join, message persistence, REST↔socket fanout.
 */
test.describe('real-time messaging', () => {
  test('a message posted by the adopter appears on the rescue side', async ({ apiAs, asRole }) => {
    const adopterApi = await apiAs('adopter');
    const { chatId } = await getFirstAdopterChat(adopterApi);

    const rescuePage = await asRole('rescue');
    await rescuePage.goto('/communication', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(rescuePage.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    const message = uniqueText('chat-propagation');
    const sendRes = await postWithCsrf(adopterApi.context, `/api/v1/chats/${chatId}/messages`, {
      content: message,
      messageType: 'text',
    });
    await expectOk(sendRes, `POST /api/v1/chats/${chatId}/messages`);

    await expect(rescuePage.getByText(message).first()).toBeVisible({ timeout: 30_000 });
  });
});
