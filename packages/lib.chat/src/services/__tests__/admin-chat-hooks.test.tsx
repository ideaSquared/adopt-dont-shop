import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useAdminChatById,
  useAdminChatMessages,
  useAdminChatMutations,
  useAdminChats,
  useAdminChatStats,
  useAdminSearchChats,
} from '../admin-chat-hooks';

const get = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    get: (...args: unknown[]) => get(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}));

const chatListResponse = {
  success: true,
  data: [{ id: 'chat-1' }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAdminChats', () => {
  it('fetches chats with the provided filters and exposes the response', async () => {
    get.mockResolvedValue(chatListResponse);

    const filters = { status: 'active', page: 2 };
    const { result } = renderHook(() => useAdminChats(filters));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).toHaveBeenCalledWith('/api/v1/chats', filters);
    expect(result.current.data).toEqual(chatListResponse);
    expect(result.current.error).toBeNull();
  });

  it('captures the error when the request fails', async () => {
    const failure = new Error('boom');
    get.mockRejectedValue(failure);

    const { result } = renderHook(() => useAdminChats());

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.data).toBeNull();
  });

  it('refetches on demand', async () => {
    get.mockResolvedValue(chatListResponse);
    const { result } = renderHook(() => useAdminChats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    get.mockClear();

    await result.current.refetch();
    expect(get).toHaveBeenCalledWith('/api/v1/chats', {});
  });
});

describe('useAdminChatById', () => {
  it('does not fetch when chatId is null and resolves loading to false', async () => {
    const { result } = renderHook(() => useAdminChatById(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('unwraps the data envelope when a chatId is supplied', async () => {
    get.mockResolvedValue({ success: true, data: { id: 'chat-9' } });

    const { result } = renderHook(() => useAdminChatById('chat-9'));

    await waitFor(() => expect(result.current.data).toEqual({ id: 'chat-9' }));
    expect(get).toHaveBeenCalledWith('/api/v1/chats/chat-9');
  });

  it('records the error on failure', async () => {
    const failure = new Error('not found');
    get.mockRejectedValue(failure);

    const { result } = renderHook(() => useAdminChatById('chat-9'));

    await waitFor(() => expect(result.current.error).toBe(failure));
  });
});

describe('useAdminChatMessages', () => {
  it('wraps the newest keyset page in the data envelope and sends no cursor', async () => {
    // The route is a keyset feed: the newest page is requested with limit only
    // (no cursor); the hook wraps messages + pagination in { data }.
    const routeBody = {
      messages: [{ id: 'm1' }],
      nextCursor: 'cursor-1',
      pagination: { page: 1, limit: 25, hasNext: true, hasPrev: false, nextCursor: 'cursor-1' },
    };
    get.mockResolvedValue(routeBody);

    const { result } = renderHook(() => useAdminChatMessages('chat-1', 25));

    await waitFor(() =>
      expect(result.current.data).toEqual({
        success: true,
        data: {
          messages: [{ id: 'm1' }],
          pagination: { page: 1, limit: 25, hasNext: true, hasPrev: false, nextCursor: 'cursor-1' },
        },
      })
    );
    expect(get).toHaveBeenCalledWith('/api/v1/chats/chat-1/messages', { limit: 25 });
    expect(result.current.hasMore).toBe(true);
  });

  it('threads nextCursor into loadMore and appends the older page (ADS-1209)', async () => {
    get
      .mockResolvedValueOnce({
        messages: [{ id: 'newest' }],
        nextCursor: 'cursor-1',
        pagination: { page: 1, limit: 50, hasNext: true, hasPrev: false, nextCursor: 'cursor-1' },
      })
      .mockResolvedValueOnce({
        messages: [{ id: 'older' }],
        pagination: { page: 1, limit: 50, hasNext: false, hasPrev: true },
      });

    const { result } = renderHook(() => useAdminChatMessages('chat-1'));

    await waitFor(() => expect(result.current.data?.data.messages).toHaveLength(1));

    await result.current.loadMore();

    await waitFor(() => expect(result.current.data?.data.messages).toHaveLength(2));
    // The second fetch carries the cursor from the first response...
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/chats/chat-1/messages', {
      limit: 50,
      cursor: 'cursor-1',
    });
    // ...and the list grows rather than resetting to the newest page.
    expect(result.current.data?.data.messages).toEqual([{ id: 'newest' }, { id: 'older' }]);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch again on loadMore once the feed is exhausted', async () => {
    get.mockResolvedValue({
      messages: [{ id: 'only' }],
      pagination: { page: 1, limit: 50, hasNext: false, hasPrev: false },
    });

    const { result } = renderHook(() => useAdminChatMessages('chat-1'));
    await waitFor(() => expect(result.current.data?.data.messages).toHaveLength(1));

    await result.current.loadMore();
    // hasNext was false, so there is no cursor to page with — no extra request.
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('skips fetching when chatId is null', async () => {
    const { result } = renderHook(() => useAdminChatMessages(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).not.toHaveBeenCalled();
  });
});

describe('useAdminChatStats', () => {
  it('unwraps the stats data envelope', async () => {
    const stats = {
      totalChats: 3,
      totalMessages: 10,
      activeChats: 2,
      averageMessagesPerChat: 3.3,
    };
    get.mockResolvedValue({ success: true, data: stats });

    const { result } = renderHook(() => useAdminChatStats());

    await waitFor(() => expect(result.current.data).toEqual(stats));
    expect(get).toHaveBeenCalledWith('/api/v1/chats/analytics');
  });
});

describe('useAdminSearchChats', () => {
  it('does not search for an empty query', async () => {
    const { result } = renderHook(() => useAdminSearchChats(''));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).not.toHaveBeenCalled();
  });

  it('does not search when disabled', async () => {
    const { result } = renderHook(() => useAdminSearchChats('cats', false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(get).not.toHaveBeenCalled();
  });

  it('searches when a query is supplied and enabled', async () => {
    get.mockResolvedValue(chatListResponse);

    const { result } = renderHook(() => useAdminSearchChats('cats'));

    await waitFor(() => expect(result.current.data).toEqual(chatListResponse));
    expect(get).toHaveBeenCalledWith('/api/v1/chats/search', { query: 'cats' });
  });
});

describe('useAdminChatMutations', () => {
  it('deletes a chat via mutate', async () => {
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminChatMutations());

    await result.current.deleteChat.mutate('chat-1');

    expect(del).toHaveBeenCalledWith('/api/v1/chats/chat-1');
  });

  it('returns the result from deleteChat.mutateAsync', async () => {
    del.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAdminChatMutations());

    const value = await result.current.deleteChat.mutateAsync('chat-2');

    expect(value).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith('/api/v1/chats/chat-2');
  });

  it('rethrows when deleteChat fails', async () => {
    const failure = new Error('forbidden');
    del.mockRejectedValue(failure);
    const { result } = renderHook(() => useAdminChatMutations());

    await expect(result.current.deleteChat.mutate('chat-1')).rejects.toThrow('forbidden');
  });

  it('updates chat status via patch', async () => {
    patch.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminChatMutations());

    await result.current.updateChatStatus.mutate({ chatId: 'chat-1', status: 'archived' });

    expect(patch).toHaveBeenCalledWith('/api/v1/chats/chat-1', { status: 'archived' });
  });

  it('returns the result from updateChatStatus.mutateAsync', async () => {
    patch.mockResolvedValue({ id: 'chat-1', status: 'archived' });
    const { result } = renderHook(() => useAdminChatMutations());

    const value = await result.current.updateChatStatus.mutateAsync({
      chatId: 'chat-1',
      status: 'archived',
    });

    expect(value).toEqual({ id: 'chat-1', status: 'archived' });
  });

  it('rethrows when updateChatStatus fails', async () => {
    patch.mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useAdminChatMutations());

    await expect(
      result.current.updateChatStatus.mutate({ chatId: 'chat-1', status: 'x' })
    ).rejects.toThrow('bad');
  });

  it('deletes a message via mutate', async () => {
    del.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminChatMutations());

    await result.current.deleteMessage.mutate({ chatId: 'chat-1', messageId: 'msg-1' });

    expect(del).toHaveBeenCalledWith('/api/v1/chats/chat-1/messages/msg-1');
  });

  it('returns the result from deleteMessage.mutateAsync', async () => {
    del.mockResolvedValue({ deleted: true });
    const { result } = renderHook(() => useAdminChatMutations());

    const value = await result.current.deleteMessage.mutateAsync({
      chatId: 'chat-1',
      messageId: 'msg-1',
    });

    expect(value).toEqual({ deleted: true });
  });

  it('rethrows when deleteMessage fails', async () => {
    del.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useAdminChatMutations());

    await expect(
      result.current.deleteMessage.mutate({ chatId: 'chat-1', messageId: 'msg-1' })
    ).rejects.toThrow('nope');
  });
});
