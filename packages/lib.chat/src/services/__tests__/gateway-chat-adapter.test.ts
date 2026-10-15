import { toConversation, toMessage } from '../gateway-chat-adapter';

describe('gateway chat adapter', () => {
  const chat = {
    chatId: 'chat-1',
    participantUserIds: ['user-1', 'staff-1'],
    lastMessagePreview: 'See you Saturday',
    lastMessageAt: '2026-10-10T10:19:51.896Z',
    lastMessageSenderId: 'staff-1',
    createdAt: '2026-10-10T10:15:31.807Z',
    updatedAt: '2026-10-10T10:19:51.896Z',
    status: 'CHAT_STATUS_ACTIVE',
  };

  it('identifies a conversation by its chat id', () => {
    const conversation = toConversation(chat);

    expect(conversation.id).toBe('chat-1');
    expect(conversation.participants.map((p) => p.id)).toEqual(['user-1', 'staff-1']);
  });

  it('shows the latest message preview from its sender', () => {
    const { lastMessage } = toConversation(chat);

    expect(lastMessage).toMatchObject({
      conversationId: 'chat-1',
      senderId: 'staff-1',
      content: 'See you Saturday',
      timestamp: '2026-10-10T10:19:51.896Z',
    });
  });

  it('has no latest message for a chat nobody has written in', () => {
    const { lastMessagePreview: _p, lastMessageAt: _a, lastMessageSenderId: _s, ...empty } = chat;

    expect(toConversation(empty).lastMessage).toBeUndefined();
  });

  it("carries the caller's unread count from the chat list", () => {
    expect(toConversation({ ...chat, unreadCount: 3 }).unreadCount).toBe(3);
  });

  it('counts nothing as unread when the gateway sends no count', () => {
    expect(toConversation(chat).unreadCount).toBe(0);
  });

  it('treats a locked chat as closed, not as an active one that can take messages', () => {
    expect(toConversation({ ...chat, status: 'CHAT_STATUS_LOCKED' })).toMatchObject({
      status: 'closed',
      isActive: false,
    });
  });

  it('reads the proto status as active or archived', () => {
    expect(toConversation(chat)).toMatchObject({ status: 'active', isActive: true });
    expect(toConversation({ ...chat, status: 'CHAT_STATUS_ARCHIVED' })).toMatchObject({
      status: 'archived',
      isActive: false,
    });
  });

  it('turns a gateway message into a delivered text message', () => {
    const message = toMessage({
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'user-1',
      body: 'Hello!',
      createdAt: '2026-10-10T10:55:24.547Z',
    });

    expect(message).toMatchObject({
      id: 'msg-1',
      conversationId: 'chat-1',
      senderId: 'user-1',
      content: 'Hello!',
      timestamp: '2026-10-10T10:55:24.547Z',
      type: 'text',
      status: 'delivered',
    });
  });

  it('stamps a real-time message that carries no timestamp with the time it arrived', () => {
    const before = Date.now();
    const message = toMessage({
      messageId: 'msg-2',
      chatId: 'chat-1',
      senderUserId: 'staff-1',
      body: 'Hi',
    });

    expect(new Date(message.timestamp).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("carries the sender's resolved display name onto the message (ADS-1408)", () => {
    const message = toMessage({
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'staff-1',
      senderName: 'Sam Rescue',
      body: 'Hello!',
    });

    expect(message.senderName).toBe('Sam Rescue');
  });

  it('falls back to an empty sender name when the gateway sends none (e.g. a WS event)', () => {
    const message = toMessage({
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'staff-1',
      body: 'Hello!',
    });

    expect(message.senderName).toBe('');
  });

  it("maps each participant's resolved display name from participantNames (ADS-1408)", () => {
    const conversation = toConversation({
      ...chat,
      participantNames: { 'user-1': 'Jo Adopter', 'staff-1': 'Sam Rescue' },
    });

    expect(conversation.participants).toEqual([
      { id: 'user-1', name: 'Jo Adopter', type: 'user' },
      { id: 'staff-1', name: 'Sam Rescue', type: 'user' },
    ]);
  });

  it('falls back to an empty participant name when none resolved', () => {
    const conversation = toConversation(chat);

    expect(conversation.participants).toEqual([
      { id: 'user-1', name: '', type: 'user' },
      { id: 'staff-1', name: '', type: 'user' },
    ]);
  });

  it("carries the last message's resolved sender name onto its preview", () => {
    const conversation = toConversation({ ...chat, lastMessageSenderName: 'Sam Rescue' });

    expect(conversation.lastMessage).toMatchObject({ senderName: 'Sam Rescue' });
  });
});
