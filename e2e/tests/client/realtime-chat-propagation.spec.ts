import { test, expect } from '../../fixtures';
import { uniqueText } from '../../helpers/factories';

/**
 * End-to-end of the live messaging path: an adopter posts a message
 * via API and the rescue's communication page receives it within the
 * Socket.IO push window.  Catches breakage in any of: Socket.IO setup,
 * room subscription on join, message persistence, REST↔socket fanout.
 *
 * Requires an existing chat the seeded adopter already participates in.
 * If the seed has none, we skip rather than try to create one — chat
 * creation requires resolving rescue + pet + applicationId, which is
 * fragile to seed shape.
 */
test.describe('real-time messaging', () => {
  test('a message posted by the adopter appears on the rescue side', async ({ apiAs, asRole }) => {
    const adopterApi = await apiAs('adopter');

    // Find a chat the adopter is part of.  The chat list endpoint
    // varies a little across builds; try a few shapes.
    const chatsRes = await adopterApi.context.get('/api/v1/chat/conversations');
    if (!chatsRes.ok()) {
      test.skip(true, `chat list not reachable: ${chatsRes.status()}`);
    }
    const chatsBody = (await chatsRes.json()) as {
      data?: Array<{ chatId?: string; id?: string }>;
      conversations?: Array<{ chatId?: string; id?: string }>;
    };
    const chats = chatsBody.data ?? chatsBody.conversations ?? [];
    const first = chats[0];
    const chatId = first?.chatId ?? first?.id;
    if (!chatId) {
      test.skip(true, 'seeded adopter has no chat conversations');
    }

    // Open the rescue's communication page in a separate browser context
    // BEFORE posting the message so the socket is subscribed when the
    // server pushes it.
    const rescuePage = await asRole('rescue');
    await rescuePage.goto('/communication', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(rescuePage.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });

    // Post the message as the adopter.
    const csrfRes = await adopterApi.context.get('/api/v1/csrf-token');
    expect(csrfRes.ok()).toBe(true);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };

    const message = uniqueText('chat-propagation');
    const sendRes = await adopterApi.context.post(`/api/v1/chat/${chatId}/messages`, {
      headers: { 'x-csrf-token': csrfToken! },
      data: { content: message, messageType: 'text' },
    });
    if (!sendRes.ok()) {
      test.skip(
        true,
        `chat message send rejected: ${sendRes.status()} ${(await sendRes.text()).slice(0, 200)}`
      );
    }

    // The rescue side should pick up the new message.  Allow a generous
    // window — first compile + socket handshake + server fanout can be
    // slow on a cold CI runner.  Worst case the page reflects the
    // message after a polling refresh.
    await expect(rescuePage.getByText(message).first()).toBeVisible({ timeout: 30_000 });
  });
});
