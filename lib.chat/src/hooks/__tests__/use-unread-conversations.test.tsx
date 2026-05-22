import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { ChatProvider } from '../../context/ChatProvider';
import { ChatService } from '../../services/chat-service';
import type { Conversation, Message } from '../../types';
import {
  UNREAD_BROADCAST_CHANNEL,
  useUnreadConversations,
  type UseUnreadConversationsResult,
} from '../use-unread-conversations';
import { buildChatContextValue, renderWithChatContext } from '../../test-utils';

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

type ProviderHarness = {
  chatService: ChatService;
};

const buildProviderHarness = (initialConversations: Conversation[]): ProviderHarness => {
  const chatService = new ChatService();
  vi.spyOn(chatService, 'connect').mockImplementation(() => {
    chatService.simulateConnectEvent();
  });
  vi.spyOn(chatService, 'disconnect').mockImplementation(() => {});
  vi.spyOn(chatService, 'getConversations').mockResolvedValue(initialConversations);
  return { chatService };
};

const Probe = ({
  onState,
  triggerMarkRead,
}: {
  onState: (state: UseUnreadConversationsResult) => void;
  triggerMarkRead?: string | null;
}) => {
  const state = useUnreadConversations();
  useEffect(() => {
    onState(state);
  });
  useEffect(() => {
    if (triggerMarkRead) {
      void state.markRead(triggerMarkRead);
    }
    // markRead is intentionally omitted: we want to fire exactly once when
    // the probed conversationId is supplied, not whenever the callback
    // identity changes. eslint-disable-next-line react-hooks/exhaustive-deps
    // is unnecessary here because the rule is project-configured and the
    // intent is clear from the dep array.
  }, [triggerMarkRead]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

describe('useUnreadConversations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when used outside a ChatProvider', () => {
    const BadConsumer = () => {
      useUnreadConversations();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(/useChat must be used within a ChatProvider/);
    spy.mockRestore();
  });

  it('derives totalUnread and unreadByConversationId from the chat context on initial fetch', () => {
    const value = buildChatContextValue({
      conversations: [
        buildConversation({ id: 'a', unreadCount: 2 }),
        buildConversation({ id: 'b', unreadCount: 5 }),
        buildConversation({ id: 'c', unreadCount: 0 }),
      ],
    });

    let latest: UseUnreadConversationsResult | null = null;
    renderWithChatContext(<Probe onState={(s) => (latest = s)} />, { value });

    expect(latest?.totalUnread).toBe(7);
    expect(latest?.unreadByConversationId).toEqual({ a: 2, b: 5, c: 0 });
  });

  it('updates counts in real time when the socket delivers a new message to a non-active conversation', async () => {
    const active = buildConversation({ id: 'chat-1', unreadCount: 0 });
    const other = buildConversation({ id: 'chat-2', unreadCount: 0 });
    const { chatService } = buildProviderHarness([active, other]);

    let latest: UseUnreadConversationsResult | null = null;

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
      >
        <Probe onState={(s) => (latest = s)} />
      </ChatProvider>
    );

    await waitFor(() =>
      expect(latest?.unreadByConversationId).toEqual({ 'chat-1': 0, 'chat-2': 0 })
    );

    await act(async () => {
      chatService.simulateIncomingMessage(
        buildMessage({ id: 'msg-2', conversationId: 'chat-2', content: 'Ping' })
      );
    });

    await waitFor(() => expect(latest?.totalUnread).toBe(1));
    expect(latest?.unreadByConversationId['chat-2']).toBe(1);
    expect(latest?.unreadByConversationId['chat-1']).toBe(0);
  });

  it('clears the counter when markRead is called and forwards to the chat service', async () => {
    const conv = buildConversation({ id: 'chat-1', unreadCount: 4 });
    const { chatService } = buildProviderHarness([conv]);
    const markSpy = vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

    let latest: UseUnreadConversationsResult | null = null;
    let triggered = false;
    const Wrapper = () => {
      const state = useUnreadConversations();
      latest = state;
      useEffect(() => {
        if (!triggered && state.unreadByConversationId['chat-1'] === 4) {
          triggered = true;
          void state.markRead('chat-1');
        }
      });
      return null;
    };

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
      >
        <Wrapper />
      </ChatProvider>
    );

    await waitFor(() => expect(markSpy).toHaveBeenCalledWith('chat-1'));
    await waitFor(() => expect(latest?.totalUnread).toBe(0));
    expect(latest?.unreadByConversationId['chat-1']).toBe(0);
  });

  it('clears the counter when another tab broadcasts a mark-read event', async () => {
    const conv = buildConversation({ id: 'chat-1', unreadCount: 3 });
    const { chatService } = buildProviderHarness([conv]);
    vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

    let latest: UseUnreadConversationsResult | null = null;

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
      >
        <Probe onState={(s) => (latest = s)} />
      </ChatProvider>
    );

    await waitFor(() => expect(latest?.unreadByConversationId['chat-1']).toBe(3));

    // Simulate "another tab" by opening a separate BroadcastChannel on the
    // same name and posting the mark-read event. The hook's listener should
    // pick it up and clear the badge.
    const otherTab = new BroadcastChannel(UNREAD_BROADCAST_CHANNEL);
    await act(async () => {
      otherTab.postMessage({ type: 'mark-read', conversationId: 'chat-1' });
      // BroadcastChannel delivery is async — yield to the event loop.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    otherTab.close();

    await waitFor(() => expect(latest?.unreadByConversationId['chat-1']).toBe(0));
    expect(latest?.totalUnread).toBe(0);
  });

  it('broadcasts mark-read events to other tabs', async () => {
    const conv = buildConversation({ id: 'chat-1', unreadCount: 2 });
    const { chatService } = buildProviderHarness([conv]);
    vi.spyOn(chatService, 'markAsRead').mockResolvedValue();

    const otherTab = new BroadcastChannel(UNREAD_BROADCAST_CHANNEL);
    const received: Array<{ type: string; conversationId: string }> = [];
    otherTab.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (typeof data === 'object' && data !== null) {
        const candidate = data as { type?: unknown; conversationId?: unknown };
        if (typeof candidate.type === 'string' && typeof candidate.conversationId === 'string') {
          received.push({ type: candidate.type, conversationId: candidate.conversationId });
        }
      }
    });

    let triggered = false;
    const Wrapper = () => {
      const state = useUnreadConversations();
      useEffect(() => {
        if (!triggered && state.unreadByConversationId['chat-1'] === 2) {
          triggered = true;
          void state.markRead('chat-1');
        }
      });
      return null;
    };

    render(
      <ChatProvider
        chatService={chatService}
        user={{ userId: 'user-1' }}
        isAuthenticated
      >
        <Wrapper />
      </ChatProvider>
    );

    await waitFor(() =>
      expect(received).toContainEqual({ type: 'mark-read', conversationId: 'chat-1' })
    );
    otherTab.close();
  });
});
