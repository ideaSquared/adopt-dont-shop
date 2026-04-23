import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Conversation, Message, ReadStatusUpdateEvent } from '@/services';
import { ChatProvider, useChat } from '../ChatContext';

type MessageHandler = (m: Message) => void;
type ReadStatusHandler = (e: ReadStatusUpdateEvent) => void;

const messageHandlers: MessageHandler[] = [];
const readStatusHandlers: ReadStatusHandler[] = [];

const buildConv = (id: string, unread: number): Conversation =>
  ({
    id,
    chat_id: id,
    participants: [],
    unreadCount: unread,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isActive: true,
  }) as Conversation;

const buildMessage = (conversationId: string, id: string): Message =>
  ({
    id,
    conversationId,
    senderId: 'other-user',
    senderName: 'Other',
    content: 'hello',
    timestamp: new Date().toISOString(),
    type: 'text',
    status: 'delivered',
  }) as Message;

let seededConversations: Conversation[] = [];

vi.mock('@/services', () => ({
  chatService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getConversations: vi.fn(async () => seededConversations),
    getMessages: vi.fn(async () => ({ data: [] })),
    markAsRead: vi.fn(async () => undefined),
    onMessage: vi.fn((cb: MessageHandler) => {
      messageHandlers.push(cb);
    }),
    onTyping: vi.fn(),
    onReactionUpdate: vi.fn(),
    onReadStatusUpdate: vi.fn((cb: ReadStatusHandler) => {
      readStatusHandlers.push(cb);
    }),
    off: vi.fn(),
    getConnectionStatus: vi.fn(() => 'connected'),
    getReconnectionAttempts: vi.fn(() => 0),
    onConnectionStatusChange: vi.fn(),
    offConnectionStatusChange: vi.fn(),
  },
  authService: {
    getToken: vi.fn(() => 'test-token'),
  },
  useConnectionStatus: () => ({
    status: 'connected',
    isConnected: true,
    isReconnecting: false,
    reconnectionAttempts: 0,
  }),
}));

vi.mock('@/utils/offlineManager', () => ({
  isCurrentlyOnline: () => true,
  getConnectionQuality: () => 'excellent',
  offlineManager: { setSyncCallback: vi.fn(), forceSync: vi.fn() },
  onOfflineStateChange: vi.fn(),
  removeOfflineStateListener: vi.fn(),
  queueMessageForOffline: vi.fn(() => 'tmp-id'),
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { userId: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

const wrapper = ({ children }: { children: ReactNode }) => <ChatProvider>{children}</ChatProvider>;

describe('ChatContext unreadMessageCount', () => {
  beforeEach(() => {
    messageHandlers.length = 0;
    readStatusHandlers.length = 0;
    seededConversations = [buildConv('c1', 2), buildConv('c2', 3), buildConv('c3', 0)];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sums unreadCount across conversations', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(3);
    });
    expect(result.current.unreadMessageCount).toBe(5);
  });

  it('increments unreadCount when a message arrives in an inactive conversation', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(3);
    });
    await waitFor(() => {
      expect(messageHandlers.length).toBeGreaterThan(0);
    });

    act(() => {
      messageHandlers[0](buildMessage('c1', 'm-new'));
    });

    expect(result.current.unreadMessageCount).toBe(6);
    expect(result.current.conversations.find(c => c.id === 'c1')?.unreadCount).toBe(3);
  });

  it('does not increment unreadCount when a message arrives in the active conversation', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(3);
    });

    act(() => {
      const active = result.current.conversations.find(c => c.id === 'c1')!;
      result.current.setActiveConversation(active);
    });

    await waitFor(() => {
      expect(result.current.activeConversation?.id).toBe('c1');
    });

    act(() => {
      messageHandlers[0](buildMessage('c1', 'm-active'));
    });

    expect(result.current.conversations.find(c => c.id === 'c1')?.unreadCount).toBe(2);
    expect(result.current.unreadMessageCount).toBe(5);
  });

  it('resets a conversation unreadCount to zero on readStatus update', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(3);
    });
    await waitFor(() => {
      expect(readStatusHandlers.length).toBeGreaterThan(0);
    });

    act(() => {
      readStatusHandlers[0]({
        chatId: 'c2',
        userId: 'u1',
        timestamp: new Date().toISOString(),
      } as ReadStatusUpdateEvent);
    });

    expect(result.current.conversations.find(c => c.id === 'c2')?.unreadCount).toBe(0);
    expect(result.current.unreadMessageCount).toBe(2);
  });
});
