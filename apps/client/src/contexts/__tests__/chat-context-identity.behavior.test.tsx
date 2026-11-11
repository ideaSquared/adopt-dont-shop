import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AuthUser = { userId: string; email: string; firstName: string; lastName: string } | null;

const userA = { userId: 'user-a', email: 'a@x.test', firstName: 'A', lastName: 'A' };
const userB = { userId: 'user-b', email: 'b@x.test', firstName: 'B', lastName: 'B' };

let authUser: AuthUser = userA;

// Stand-in for ChatService's own disconnected-queue: it survives disconnect(), is flushed
// asynchronously once a socket connects, and is emptied by clearMessageQueue().
type ServiceQueueItem = { conversationId: string; content: string };
let serviceQueue: ServiceQueueItem[] = [];
let connectedAs: string | null = null;
let flushed: Array<{ sentAs: string; content: string }> = [];

const sendMessage = vi.fn(async (_conversationId: string, _content: string) => ({
  id: 'm1',
}));

vi.mock('@/services', () => ({
  chatService: {
    connect: vi.fn((userId: string) => {
      connectedAs = userId;
      setTimeout(() => {
        const queued = serviceQueue;
        serviceQueue = [];
        flushed = [...flushed, ...queued.map(q => ({ sentAs: userId, content: q.content }))];
      }, 0);
    }),
    disconnect: vi.fn(() => {
      connectedAs = null;
    }),
    clearMessageQueue: vi.fn(() => {
      serviceQueue = [];
    }),
    sendMessage: (conversationId: string, content: string) => sendMessage(conversationId, content),
    getConversations: vi.fn(async () => []),
    getMessages: vi.fn(async () => ({ data: [] })),
    markAsRead: vi.fn(async () => undefined),
    onMessage: vi.fn(),
    onTyping: vi.fn(),
    onReactionUpdate: vi.fn(),
    onReadStatusUpdate: vi.fn(),
    off: vi.fn(),
    getConnectionStatus: vi.fn(() => 'connected'),
    getReconnectionAttempts: vi.fn(() => 0),
    onConnectionStatusChange: vi.fn(),
    offConnectionStatusChange: vi.fn(),
    onConnectionError: vi.fn(),
    offConnectionError: vi.fn(),
  },
  authService: { getToken: vi.fn(() => 'test-token') },
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: authUser,
      isAuthenticated: authUser !== null,
      isInitializing: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

import { offlineManager } from '@/utils/offlineManager';
import { ChatProvider } from '../ChatContext';

const tree = () => <ChatProvider>{null}</ChatProvider>;

describe('ChatContext identity changes', () => {
  beforeEach(() => {
    localStorage.clear();
    authUser = userA;
    serviceQueue = [];
    flushed = [];
    connectedAs = null;
    offlineManager.setSyncCallback(null);
    offlineManager.clearQueues();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const signInAs = (view: ReturnType<typeof render>, user: AuthUser) => {
    authUser = user;
    act(() => view.rerender(tree()));
  };

  it('does not send a message user A queued in the chat service once user B connects', async () => {
    const view = render(tree());
    await waitFor(() => expect(connectedAs).toBe('user-a'));
    serviceQueue = [{ conversationId: 'c1', content: 'secret from A' }];

    signInAs(view, userB);
    await waitFor(() => expect(connectedAs).toBe('user-b'));
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(flushed).toEqual([]);
  });

  it('drops the chat service queue when the session ends without a new sign-in', async () => {
    const view = render(tree());
    await waitFor(() => expect(connectedAs).toBe('user-a'));
    serviceQueue = [{ conversationId: 'c1', content: 'secret from A' }];

    signInAs(view, null);
    await waitFor(() => expect(connectedAs).toBeNull());
    signInAs(view, userB);
    await waitFor(() => expect(connectedAs).toBe('user-b'));
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(flushed).toEqual([]);
  });

  it('stops sending user A queued messages when user B signs in mid-sync', async () => {
    const view = render(tree());
    await waitFor(() => expect(connectedAs).toBe('user-a'));
    await waitFor(() => expect(offlineManager.getCurrentState().isOnline).toBe(true));
    offlineManager.queueMessage('c1', 'first from A');
    offlineManager.queueMessage('c1', 'second from A');
    offlineManager.queueMessage('c1', 'third from A');

    let releaseFirst: () => void = () => undefined;
    sendMessage.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          releaseFirst = () => resolve({ id: 'm1' });
        })
    );
    const sync = offlineManager.forceSync();
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

    signInAs(view, userB);
    await waitFor(() => expect(connectedAs).toBe('user-b'));
    releaseFirst();
    await sync;

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('c1', 'first from A');
    expect(offlineManager.getCurrentState().pendingMessages).toEqual([]);
  });
});
