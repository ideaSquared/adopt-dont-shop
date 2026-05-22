import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useChat } from '../context/use-chat';

/**
 * Name of the BroadcastChannel used to sync mark-read events between tabs
 * of the same origin. Exposed so consumers (and tests) can target it
 * deterministically; not intended to be reconfigured by host apps.
 */
export const UNREAD_BROADCAST_CHANNEL = 'adopt-dont-shop:chat:unread';

type UnreadBroadcastMessage = {
  type: 'mark-read';
  conversationId: string;
};

const isUnreadBroadcastMessage = (data: unknown): data is UnreadBroadcastMessage => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const candidate = data as { type?: unknown; conversationId?: unknown };
  return candidate.type === 'mark-read' && typeof candidate.conversationId === 'string';
};

export type UseUnreadConversationsResult = {
  /** Total unread messages across every conversation the current user can see. */
  totalUnread: number;
  /** Map of conversationId → unread message count. Conversations with 0 unread are still present. */
  unreadByConversationId: Readonly<Record<string, number>>;
  /**
   * Mark a conversation as read. Optimistically clears the local counter via
   * the shared chat context, fires the backend POST, and broadcasts to other
   * tabs of this origin so their counters clear too.
   */
  markRead: (conversationId: string) => Promise<void>;
};

/**
 * `useUnreadConversations` — the single source of truth for unread-message
 * indicators across `app.client`, `app.rescue`, and `app.admin`.
 *
 * Data flow:
 * - Reads `conversations` from {@link useChat}. The provider already keeps
 *   `unreadCount` in sync with the live socket (new messages bump it,
 *   `messages_read` events clear it), so consumers automatically update in
 *   real time without polling.
 * - `markRead(conversationId)` calls the context's `markAsRead` (which
 *   optimistically zeroes the counter + persists via the backend) **and**
 *   posts a `mark-read` message to a {@link BroadcastChannel} so other
 *   tabs/windows of the same origin clear their counters too.
 *
 * Must be used inside a `ChatProvider`. Apps without a provider will see the
 * same `useChat must be used within a ChatProvider` error that the rest of
 * the library throws.
 *
 * @example
 * ```tsx
 * const { totalUnread, unreadByConversationId, markRead } = useUnreadConversations();
 *
 * // Header badge
 * return <Badge count={totalUnread} />;
 *
 * // Per-conversation badge
 * const count = unreadByConversationId[conversationId] ?? 0;
 *
 * // Clear after opening
 * await markRead(conversationId);
 * ```
 */
export const useUnreadConversations = (): UseUnreadConversationsResult => {
  const { conversations, markAsRead } = useChat();

  const unreadByConversationId = useMemo<Readonly<Record<string, number>>>(() => {
    const entries: Record<string, number> = {};
    for (const conv of conversations) {
      entries[conv.id] = conv.unreadCount ?? 0;
    }
    return entries;
  }, [conversations]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [conversations]
  );

  // BroadcastChannel handle is held in a ref so the same instance survives
  // re-renders and the callbacks below can read/post without re-subscribing.
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Keep the latest markAsRead in a ref so the BroadcastChannel listener
  // doesn't need to be torn down + re-attached every time the context's
  // callback identity changes.
  const markAsReadRef = useRef(markAsRead);
  useEffect(() => {
    markAsReadRef.current = markAsRead;
  }, [markAsRead]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel(UNREAD_BROADCAST_CHANNEL);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      if (!isUnreadBroadcastMessage(event.data)) {
        return;
      }
      // Mirror the mark-read action in this tab. The chat context's
      // `markAsRead` is optimistic (it zeroes the counter immediately), so
      // calling it here is what makes the badge clear across tabs. We
      // intentionally do not re-broadcast — the originating tab already did.
      void markAsReadRef.current(event.data.conversationId);
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const markRead = useCallback(
    async (conversationId: string) => {
      await markAsRead(conversationId);
      const channel = channelRef.current;
      if (channel) {
        const message: UnreadBroadcastMessage = { type: 'mark-read', conversationId };
        channel.postMessage(message);
      }
    },
    [markAsRead]
  );

  return { totalUnread, unreadByConversationId, markRead };
};
