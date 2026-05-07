import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef } from 'react';
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
  connectSpy: ReturnType<typeof vi.spyOn>;
  tokenProvider: ReturnType<typeof vi.fn>;
  getConversationsMock: ReturnType<typeof vi.fn>;
};

const buildHarness = (initialConversations: Conversation[] = [buildConversation()]): Harness2 => {
  const chatService = new ChatService();
  const connectSpy = vi.spyOn(chatService, 'connect').mockImplementation(() => {
    // Don't actually open a socket; the provider just needs the listeners to be registered.
  });
  vi.spyOn(chatService, 'disconnect').mockImplementation(() => {});

  const getConversationsMock = vi.fn().mockResolvedValue(initialConversations);
  vi.spyOn(chatService, 'getConversations').mockImplementation(getConversationsMock);

  const tokenProvider = vi.fn(() => 'test-token');

  return { chatService, connectSpy, tokenProvider, getConversationsMock };
};

describe('ChatProvider', () => {
  it('does not connect when the user is not authenticated', () => {
    const { chatService, connectSpy, tokenProvider } = buildHarness();
    const onRender = vi.fn();

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
        <TestConsumer onRender={vi.fn()} />
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

    vi.spyOn(chatService, 'getMessages').mockResolvedValue({
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
    vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

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
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
        <TestConsumer onRender={vi.fn()} />
      </ChatProvider>
    );
    expect(screen.getByTestId('consumer')).toBeInTheDocument();
  });

  it('optimistically clears unreadCount when markAsRead is called', async () => {
    const conv = buildConversation({ id: 'chat-1', unreadCount: 3 });
    const { chatService, tokenProvider } = buildHarness([conv]);

    const markSpy = vi.spyOn(chatService, 'markAsRead').mockImplementation(
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

    // Wait until the service call fires — this is the authoritative signal
    // that markAsRead ran. Asserting on unreadMessageCount alone is
    // insufficient because it starts at 0 before conversations load,
    // which lets waitFor pass trivially (before markAsRead is ever called).
    await waitFor(() => expect(markSpy).toHaveBeenCalledWith('chat-1'));
    // The optimistic setConversations update must have cleared the badge.
    expect(latest?.unreadMessageCount).toBe(0);
  });

  it('surfaces a clear error when the tokenProvider returns null at connect time', async () => {
    const { chatService } = buildHarness();
    const connectSpy = vi.spyOn(chatService, 'connect');
    const nullTokenProvider = vi.fn(() => null);

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
        tokenProvider={nullTokenProvider}
      >
        <TestConsumer onRender={vi.fn()} />
      </ChatProvider>
    );

    // connect() must not be called when the token is missing — otherwise
    // ChatService would throw and we'd swallow the error.
    await waitFor(() => expect(nullTokenProvider).toHaveBeenCalled());
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("appends the sender's own message to the stream after sendMessage resolves", async () => {
    // User journey: I type a message and hit send, I immediately see my
    // own bubble in the message stream and the conversation's lastMessage
    // updates.
    const conv = buildConversation({ id: 'chat-1' });
    const { chatService, tokenProvider } = buildHarness([conv]);

    const sent = buildMessage({
      id: 'msg-sent',
      senderId: 'user-1',
      senderName: 'Alice',
      content: 'hello there',
    });
    vi.spyOn(chatService, 'sendMessage').mockResolvedValue(sent);
    vi.spyOn(chatService, 'getMessages').mockResolvedValue({
      data: [],
      success: true,
      timestamp: '2026-01-01T00:00:00Z',
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
    });
    vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

    let latest: Harness | null = null;
    const Caller = () => {
      const ctx = useChat();
      useEffect(() => {
        if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
          ctx.setActiveConversation(ctx.conversations[0]);
        }
      }, [ctx]);
      useEffect(() => {
        if (ctx.activeConversation && ctx.messages.length === 0) {
          void ctx.sendMessage('hello there');
        }
      }, [ctx]);
      return null;
    };

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1', firstName: 'Alice' }}
        isAuthenticated
        tokenProvider={tokenProvider}
      >
        <Caller />
        <TestConsumer onRender={(h) => (latest = h)} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.messages.find((m) => m.id === 'msg-sent')).toBeDefined());
    expect(chatService.sendMessage).toHaveBeenCalledWith('chat-1', 'hello there');
  });

  it('prepends a newly started conversation to the list', async () => {
    // User journey: I click "Contact rescue" on a pet and the new chat
    // appears at the top of my Conversations list without refreshing.
    const { chatService, tokenProvider, getConversationsMock } = buildHarness([]);
    // The initial conversation fetch resolves after the startConversation
    // prepend in this test; hold it open so it doesn't race-overwrite the
    // optimistic list.
    getConversationsMock.mockImplementation(() => new Promise(() => {}));

    const newConv = buildConversation({
      id: 'chat-new',
      rescueId: 'rescue-42',
      petId: 'pet-99',
    });
    vi.spyOn(chatService, 'createConversation').mockResolvedValue(newConv);

    let latest: Harness | null = null;
    const Caller = () => {
      const ctx = useChat();
      const triggeredRef = useRef(false);
      useEffect(() => {
        if (!triggeredRef.current && ctx.conversations.length === 0) {
          triggeredRef.current = true;
          void ctx.startConversation('rescue-42', 'pet-99');
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

    await waitFor(() => expect(latest?.conversations).toHaveLength(1));
    expect(latest?.conversations[0].id).toBe('chat-new');
    expect(chatService.createConversation).toHaveBeenCalledWith({
      rescueId: 'rescue-42',
      petId: 'pet-99',
    });
  });

  it('auto-clears a typing indicator after the display window', async () => {
    // User journey: someone starts typing, I see their name; they pause,
    // and the indicator disappears on its own after ~3 seconds.
    //
    // shouldAdvanceTime lets Promise microtasks and waitFor polling
    // work correctly while fake timers are in effect.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
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
      act(() => {
        chatService.simulateTypingIndicator(typing);
      });
      expect(latest?.typingUsers).toContain('Other');

      // Advance past the 3s clear window.
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(latest?.typingUsers).not.toContain('Other');
    } finally {
      vi.useRealTimers();
    }
  });

  it('prepends older messages to the stream when loadMoreMessages is called', async () => {
    // User journey: I scroll to the top of the message stream and older
    // messages are fetched and appear above the ones I was already seeing.
    const conv = buildConversation({ id: 'chat-1' });
    const { chatService, tokenProvider } = buildHarness([conv]);

    // First page needs to fill MESSAGES_PAGE_SIZE (50) otherwise the
    // provider treats it as "no more pages" and loadMoreMessages
    // short-circuits. Synthesize 50 recent messages then one older
    // message on page 2.
    const firstPage = Array.from({ length: 50 }, (_, i) =>
      buildMessage({
        id: `m-recent-${i}`,
        timestamp: `2026-01-01T10:${String(i).padStart(2, '0')}:00Z`,
      })
    );
    const secondPage = [buildMessage({ id: 'm-older', timestamp: '2026-01-01T09:00:00Z' })];

    const getMessagesSpy = vi
      .spyOn(chatService, 'getMessages')
      .mockResolvedValueOnce({
        data: firstPage,
        success: true,
        timestamp: '2026-01-01T00:00:00Z',
        pagination: { page: 1, limit: 50, total: 51, totalPages: 2, hasNext: true, hasPrev: false },
      })
      .mockResolvedValueOnce({
        data: secondPage,
        success: true,
        timestamp: '2026-01-01T00:00:00Z',
        pagination: { page: 2, limit: 50, total: 51, totalPages: 2, hasNext: false, hasPrev: true },
      });
    vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

    let latest: Harness | null = null;
    const Caller = () => {
      const ctx = useChat();
      useEffect(() => {
        if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
          ctx.setActiveConversation(ctx.conversations[0]);
        }
      }, [ctx]);
      useEffect(() => {
        if (ctx.activeConversation && ctx.messages.length === 50) {
          void ctx.loadMoreMessages();
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

    // After loadMoreMessages, the older page should be prepended to the
    // recent page — the older message id appears first.
    await waitFor(() => expect(latest?.messages.length).toBe(51));
    expect(latest?.messages[0].id).toBe('m-older');
    expect(latest?.messages[latest?.messages.length - 1].id).toBe('m-recent-49');
    expect(getMessagesSpy).toHaveBeenCalledTimes(2);
  });
});
