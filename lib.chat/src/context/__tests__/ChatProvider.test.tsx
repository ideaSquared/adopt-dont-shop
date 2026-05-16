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
    // Don't actually open a socket — but synchronously fire the
    // 'connected' status so the provider's reconnect-queue gate (which
    // holds sends while the socket isn't connected, ADS-582) lets sends
    // flow straight through in the default test setup.
    chatService.simulateConnectEvent();
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

  it('marks a message as failed and shows a retry path when send fails repeatedly', async () => {
    // User journey: I send a message on a flaky connection, the send
    // fails. The bounded auto-retry exhausts its attempts and the bubble
    // ends up in a `failed` state so the UI can show a manual Retry
    // button. The optimistic bubble's id stays stable across retries so
    // we never double-post.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const conv = buildConversation({ id: 'chat-1' });
      const { chatService, tokenProvider } = buildHarness([conv]);

      const sendSpy = vi
        .spyOn(chatService, 'sendMessage')
        .mockRejectedValue(new Error('network down'));
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
        const triggeredRef = useRef(false);
        useEffect(() => {
          if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
            ctx.setActiveConversation(ctx.conversations[0]);
          }
        }, [ctx]);
        useEffect(() => {
          if (ctx.activeConversation && !triggeredRef.current) {
            triggeredRef.current = true;
            void ctx.sendMessage('flaky hello');
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

      // Wait for the first send attempt to land.
      await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1));

      // Drive the backoff to completion: 3 attempts total (1s, 2s gaps).
      // The provider keeps retrying until 3 failures, then gives up.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(3));

      // The optimistic message should remain (single bubble) with status `failed`.
      await waitFor(() => expect(latest?.messages).toHaveLength(1));
      expect(latest?.messages[0].status).toBe('failed');

      // No further auto retries fire beyond the bound.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(sendSpy).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries the same client message id when retryMessage is called manually', async () => {
    // User journey: my send failed and I tap the inline Retry button.
    // The retry must reuse the original optimistic bubble's id so a
    // late-arriving success from the original attempt cannot create a
    // duplicate bubble.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const conv = buildConversation({ id: 'chat-1' });
      const { chatService, tokenProvider } = buildHarness([conv]);

      const sendSpy = vi
        .spyOn(chatService, 'sendMessage')
        .mockRejectedValue(new Error('network down'));
      vi.spyOn(chatService, 'getMessages').mockResolvedValue({
        data: [],
        success: true,
        timestamp: '2026-01-01T00:00:00Z',
        pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      });
      vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

      let latest: Harness | null = null;
      let retryFn: ((messageId: string) => Promise<void>) | null = null;
      const Caller = () => {
        const ctx = useChat();
        const triggeredRef = useRef(false);
        retryFn = ctx.retryMessage;
        useEffect(() => {
          if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
            ctx.setActiveConversation(ctx.conversations[0]);
          }
        }, [ctx]);
        useEffect(() => {
          if (ctx.activeConversation && !triggeredRef.current) {
            triggeredRef.current = true;
            void ctx.sendMessage('retryable');
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

      // Wait for the first send attempt, then drive backoff to completion.
      await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(1));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(3));
      await waitFor(() => expect(latest?.messages[0]?.status).toBe('failed'));

      const failedId = latest?.messages[0].id;
      expect(failedId).toBeTruthy();

      // Manual retry — same optimistic bubble, no duplicate added.
      await act(async () => {
        await retryFn!(failedId!);
      });
      await waitFor(() => expect(sendSpy).toHaveBeenCalledTimes(4));
      expect(latest?.messages).toHaveLength(1);
      expect(latest?.messages[0].id).toBe(failedId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('queues sends issued while disconnected and flushes them on reconnect', async () => {
    // User journey: the socket is mid-reconnect when I hit send. The
    // provider holds the message locally, surfaces it as `sending`, then
    // flushes through to the server once the socket reaches `connected`.
    const conv = buildConversation({ id: 'chat-1' });
    const { chatService, connectSpy, tokenProvider } = buildHarness([conv]);

    // Override the default harness behaviour: keep the socket
    // disconnected on connect() so the send queues into the reconnect
    // buffer. The test drives reconnect manually below.
    connectSpy.mockImplementation(() => {
      // no-op — leave status at 'disconnected'.
    });

    const sent = buildMessage({
      id: 'srv-1',
      senderId: 'user-1',
      senderName: 'Alice',
      content: 'queued',
    });
    const sendSpy = vi.spyOn(chatService, 'sendMessage').mockResolvedValue(sent);
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
      const triggeredRef = useRef(false);
      useEffect(() => {
        if (ctx.conversations.length > 0 && ctx.activeConversation === null) {
          ctx.setActiveConversation(ctx.conversations[0]);
        }
      }, [ctx]);
      useEffect(() => {
        if (ctx.activeConversation && !triggeredRef.current && !ctx.isConnected) {
          triggeredRef.current = true;
          void ctx.sendMessage('queued');
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

    // The send fired while disconnected — provider must NOT have called
    // through to chatService.sendMessage yet, and the optimistic bubble
    // is visible as sending.
    await waitFor(() => expect(latest?.messages).toHaveLength(1));
    expect(latest?.messages[0].status).toBe('sending');
    expect(sendSpy).not.toHaveBeenCalled();

    // Reconnect — provider should flush the queue.
    await act(async () => {
      chatService.simulateConnectEvent();
    });

    await waitFor(() => expect(sendSpy).toHaveBeenCalledWith('chat-1', 'queued'));
    await waitFor(() => expect(latest?.messages.find((m) => m.id === 'srv-1')).toBeDefined());
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

  // ADS-583: rescue staff need to mark conversations resolved/archived
  // and have them automatically reopen when a participant replies.
  describe('updateConversationStatus + auto-reopen', () => {
    it('optimistically updates the local conversation status and calls the service', async () => {
      const conv = buildConversation({ id: 'chat-1', status: 'active' });
      const { chatService, tokenProvider } = buildHarness([conv]);
      const updateSpy = vi
        .spyOn(chatService, 'updateConversationStatus')
        .mockResolvedValue({ ...conv, status: 'archived' });

      let ctxRef: ReturnType<typeof useChat> | null = null;
      const Capture = () => {
        ctxRef = useChat();
        return null;
      };

      render(
        <ChatProvider
          chatService={chatService}
          user={{ userId: 'user-1' }}
          isAuthenticated
          tokenProvider={tokenProvider}
        >
          <Capture />
        </ChatProvider>
      );

      await waitFor(() => expect(ctxRef?.conversations).toHaveLength(1));

      await act(async () => {
        await ctxRef!.updateConversationStatus('chat-1', 'archived');
      });

      expect(updateSpy).toHaveBeenCalledWith('chat-1', 'archived');
      expect(ctxRef?.conversations[0].status).toBe('archived');
    });

    it('reverts the optimistic status change when the service call fails', async () => {
      const conv = buildConversation({ id: 'chat-1', status: 'active' });
      const { chatService, tokenProvider } = buildHarness([conv]);
      vi.spyOn(chatService, 'updateConversationStatus').mockRejectedValue(new Error('nope'));

      let ctxRef: ReturnType<typeof useChat> | null = null;
      const Capture = () => {
        ctxRef = useChat();
        return null;
      };

      render(
        <ChatProvider
          chatService={chatService}
          user={{ userId: 'user-1' }}
          isAuthenticated
          tokenProvider={tokenProvider}
        >
          <Capture />
        </ChatProvider>
      );

      await waitFor(() => expect(ctxRef?.conversations).toHaveLength(1));

      await act(async () => {
        await expect(ctxRef!.updateConversationStatus('chat-1', 'archived')).rejects.toThrow(
          'nope'
        );
      });

      expect(ctxRef?.conversations[0].status).toBe('active');
    });

    it('reopens an archived conversation when another participant sends a message', async () => {
      const conv = buildConversation({ id: 'chat-1', status: 'archived' });
      const { chatService, tokenProvider } = buildHarness([conv]);

      let ctxRef: ReturnType<typeof useChat> | null = null;
      const Capture = () => {
        ctxRef = useChat();
        return null;
      };

      render(
        <ChatProvider
          chatService={chatService}
          user={{ userId: 'user-1' }}
          isAuthenticated
          tokenProvider={tokenProvider}
        >
          <Capture />
        </ChatProvider>
      );

      await waitFor(() => expect(ctxRef?.conversations).toHaveLength(1));
      expect(ctxRef?.conversations[0].status).toBe('archived');

      const incoming = buildMessage({
        id: 'msg-from-adopter',
        senderId: 'user-other',
        content: 'one more question',
      });
      await act(async () => {
        chatService.simulateIncomingMessage(incoming);
      });

      await waitFor(() => expect(ctxRef?.conversations[0].status).toBe('active'));
    });

    it('does not reopen when the resolver themselves replies to a resolved conversation', async () => {
      const conv = buildConversation({ id: 'chat-1', status: 'archived' });
      const { chatService, tokenProvider } = buildHarness([conv]);

      let ctxRef: ReturnType<typeof useChat> | null = null;
      const Capture = () => {
        ctxRef = useChat();
        return null;
      };

      render(
        <ChatProvider
          chatService={chatService}
          user={{ userId: 'user-1' }}
          isAuthenticated
          tokenProvider={tokenProvider}
        >
          <Capture />
        </ChatProvider>
      );

      await waitFor(() => expect(ctxRef?.conversations).toHaveLength(1));

      const selfEcho = buildMessage({
        id: 'msg-self',
        senderId: 'user-1',
        content: 'a note for the record',
      });
      await act(async () => {
        chatService.simulateIncomingMessage(selfEcho);
      });

      // Status must remain archived — replying inside a resolved thread
      // should not silently reopen it for the rescue staff member who
      // closed it.
      await waitFor(() => expect(ctxRef?.messages).toHaveLength(1));
      expect(ctxRef?.conversations[0].status).toBe('archived');
    });
  });
});
