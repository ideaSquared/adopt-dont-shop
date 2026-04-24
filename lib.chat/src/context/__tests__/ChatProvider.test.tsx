import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { ChatProvider } from '../ChatProvider';
import { ChatService } from '../../services/chat-service';
import type { Conversation, Message, TypingIndicator } from '../../types';
import { useChat } from '../use-chat';

const buildConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'chat-1',
  participants: [],
  unreadCount: 0,
  updatedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  isActive: true,
  ...overrides,
});

const buildMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'chat-1',
  senderId: 'user-other',
  senderName: 'Other',
  content: 'Hello',
  timestamp: '2026-01-01T00:00:01Z',
  type: 'text',
  status: 'sent',
  ...overrides,
});

type Harness = {
  conversations: Conversation[];
  messages: Message[];
  typingUsers: string[];
  unreadMessageCount: number;
  isConnected: boolean;
};

// Test consumer — renders the context value as JSON so assertions are simple.
const TestConsumer = ({ onRender }: { onRender: (h: Harness) => void }) => {
  const ctx = useChat();
  useEffect(() => {
    onRender({
      conversations: ctx.conversations,
      messages: ctx.messages,
      typingUsers: ctx.typingUsers,
      unreadMessageCount: ctx.unreadMessageCount,
      isConnected: ctx.isConnected,
    });
  });
  return <div data-testid="consumer" />;
};

type Harness2 = {
  chatService: ChatService;
  connectSpy: jest.SpyInstance;
  tokenProvider: jest.Mock<string | null, []>;
  getConversationsMock: jest.Mock;
};

const buildHarness = (initialConversations: Conversation[] = [buildConversation()]): Harness2 => {
  const chatService = new ChatService();
  const connectSpy = jest.spyOn(chatService, 'connect').mockImplementation(() => {
    // Don't actually open a socket; the provider just needs the listeners to be registered.
  });
  jest.spyOn(chatService, 'disconnect').mockImplementation(() => {});

  const getConversationsMock = jest.fn().mockResolvedValue(initialConversations);
  jest.spyOn(chatService, 'getConversations').mockImplementation(getConversationsMock);

  const tokenProvider = jest.fn(() => 'test-token');

  return { chatService, connectSpy, tokenProvider, getConversationsMock };
};

describe('ChatProvider', () => {
  it('does not connect when the user is not authenticated', () => {
    const { chatService, connectSpy, tokenProvider } = buildHarness();
    const onRender = jest.fn();

    render(
      <ChatProvider
        chatService={chatService}
        user={null}
        isAuthenticated={false}
        tokenProvider={tokenProvider}
      >
        <TestConsumer onRender={onRender} />
      </ChatProvider>
    );

    expect(connectSpy).not.toHaveBeenCalled();
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it('connects with the token from tokenProvider when authenticated', async () => {
    const { chatService, connectSpy, tokenProvider, getConversationsMock } = buildHarness();

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1', firstName: 'Alice' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <TestConsumer onRender={jest.fn()} />
      </ChatProvider>
    );

    await waitFor(() => expect(connectSpy).toHaveBeenCalledWith('user-1', 'test-token'));
    expect(tokenProvider).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getConversationsMock).toHaveBeenCalled());
  });

  it('appends incoming messages for the active conversation without bumping unread count', async () => {
    const conversation = buildConversation({ id: 'chat-1', unreadCount: 0 });
    const { chatService, tokenProvider } = buildHarness([conversation]);

    let latest: Harness | null = null;
    const onRender = (h: Harness) => {
      latest = h;
    };

    const ActiveSetter = () => {
      const ctx = useChat();
      useEffect(() => {
        if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
          ctx.setActiveConversation(ctx.conversations[0]);
        }
      }, [ctx]);
      return null;
    };

    jest.spyOn(chatService, 'getMessages').mockResolvedValue({
      data: [],
      success: true,
      timestamp: '2026-01-01T00:00:00Z',
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    jest.spyOn(chatService, 'markAsRead').mockResolvedValue();

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1', firstName: 'Alice' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <ActiveSetter />
        <TestConsumer onRender={onRender} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.conversations).toHaveLength(1));

    const incoming = buildMessage({ id: 'msg-2', content: 'Hi there' });
    await act(async () => {
      chatService.simulateIncomingMessage(incoming);
    });

    await waitFor(() => expect(latest?.messages).toHaveLength(1));
    expect(latest?.messages[0].id).toBe('msg-2');
    // Active conversation — unread should stay at zero.
    expect(latest?.unreadMessageCount).toBe(0);
  });

  it('bumps unread count for incoming messages to a non-active conversation', async () => {
    const active = buildConversation({ id: 'chat-1' });
    const other = buildConversation({ id: 'chat-2' });
    const { chatService, tokenProvider } = buildHarness([active, other]);

    let latest: Harness | null = null;
    const onRender = (h: Harness) => {
      latest = h;
    };

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <TestConsumer onRender={onRender} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.conversations).toHaveLength(2));

    const incoming = buildMessage({ id: 'msg-3', conversationId: 'chat-2', content: 'Ping' });
    await act(async () => {
      chatService.simulateIncomingMessage(incoming);
    });

    await waitFor(() => expect(latest?.unreadMessageCount).toBe(1));
  });

  it('registers typing users when ChatService emits a typing indicator', async () => {
    const { chatService, tokenProvider } = buildHarness();

    let latest: Harness | null = null;
    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <TestConsumer onRender={(h) => (latest = h)} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.conversations).toHaveLength(1));

    const typing: TypingIndicator = {
      conversationId: 'chat-1',
      userId: 'user-other',
      userName: 'Other',
      startedAt: '2026-01-01T00:00:00Z',
    };

    await act(async () => {
      chatService.simulateTypingIndicator(typing);
    });

    await waitFor(() => expect(latest?.typingUsers).toContain('Other'));
  });

  it('exposes useChat outside the provider as an error', () => {
    const BadConsumer = () => {
      useChat();
      return null;
    };
    // Suppress expected console.error from React's re-throw.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(/useChat must be used within a ChatProvider/);
    spy.mockRestore();
  });

  it('renders the consumer tree', () => {
    const { chatService, tokenProvider } = buildHarness();
    render(
      <ChatProvider
        chatService={chatService}
        user={null}
        isAuthenticated={false}
        tokenProvider={tokenProvider}
      >
        <TestConsumer onRender={jest.fn()} />
      </ChatProvider>
    );
    expect(screen.getByTestId('consumer')).toBeInTheDocument();
  });

  it('optimistically clears unreadCount when markAsRead is called', async () => {
    const conv = buildConversation({ id: 'chat-1', unreadCount: 3 });
    const { chatService, tokenProvider } = buildHarness([conv]);

    const markSpy = jest.spyOn(chatService, 'markAsRead').mockImplementation(
      // Hold the promise open so we can assert the optimistic update
      // happened synchronously, before the network round-trip resolves.
      () => new Promise<void>(() => {})
    );

    let latest: Harness | null = null;
    const Caller = () => {
      const ctx = useChat();
      useEffect(() => {
        if (ctx.conversations.length > 0 && ctx.unreadMessageCount === 3) {
          void ctx.markAsRead('chat-1');
        }
      }, [ctx]);
      return null;
    };

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <Caller />
        <TestConsumer onRender={(h) => (latest = h)} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.unreadMessageCount).toBe(0));
    expect(markSpy).toHaveBeenCalledWith('chat-1');
  });

  it('surfaces a clear error when the tokenProvider returns null at connect time', async () => {
    const { chatService } = buildHarness();
    const connectSpy = jest.spyOn(chatService, 'connect');
    const nullTokenProvider = jest.fn(() => null);

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
        tokenProvider={nullTokenProvider}
      >
        <TestConsumer onRender={jest.fn()} />
      </ChatProvider>
    );

    // connect() must not be called when the token is missing — otherwise
    // ChatService would throw and we'd swallow the error.
    await waitFor(() => expect(nullTokenProvider).toHaveBeenCalled());
    expect(connectSpy).not.toHaveBeenCalled();
  });
});
