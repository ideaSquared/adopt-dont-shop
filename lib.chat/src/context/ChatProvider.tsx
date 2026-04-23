import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactionUpdateEvent, ReadStatusUpdateEvent } from '../services/chat-service';
import type { Conversation, Message, TypingIndicator } from '../types';
import { ChatContext } from './chat-context';
import type {
  ChatContextValue,
  ChatProviderProps,
  FeatureFlagsAdapter,
  ResolveFileUrl,
} from './chat-context-types';
import type {
  ConnectionQuality,
  OfflineState,
  PendingAction,
  PendingMessage,
} from './offline-adapter';

const MESSAGES_PAGE_SIZE = 50;
const TYPING_INDICATOR_CLEAR_MS = 3000;

type ConversationApiResponse = Conversation & { chat_id?: string };

const mapConversationIds = (list: ReadonlyArray<ConversationApiResponse>): Conversation[] =>
  list.map((conv) => ({ ...conv, id: conv.id || conv.chat_id || '' }) as Conversation);

// Defaults used when the host app doesn't supply these adapters.
const DEFAULT_FEATURE_FLAGS: FeatureFlagsAdapter = {
  checkGate: () => true,
  logEvent: () => {},
};
const DEFAULT_RESOLVE_FILE_URL: ResolveFileUrl = (url) => url;

export function ChatProvider({
  children,
  chatService,
  user,
  isAuthenticated,
  tokenProvider,
  offlineAdapter,
  featureFlags,
  resolveFileUrl,
}: ChatProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [connectionStatus, setConnectionStatus] = useState(chatService.getConnectionStatus());
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    offlineAdapter ? offlineAdapter.isCurrentlyOnline() : true
  );
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(() =>
    offlineAdapter ? offlineAdapter.getConnectionQuality() : 'excellent'
  );
  const [pendingMessageCount, setPendingMessageCount] = useState(0);

  const initializedUserIdRef = useRef<string | null>(null);
  const lastMarkedAsReadRef = useRef<string | null>(null);
  const lastLoadedMessagesRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation]);

  // Mirror ChatService connection status into React state.
  useEffect(() => {
    const listener = (status: typeof connectionStatus) => {
      setConnectionStatus(status);
      setReconnectionAttempts(chatService.getReconnectionAttempts());
    };
    chatService.onConnectionStatusChange(listener);
    return () => {
      chatService.offConnectionStatusChange(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatService]);

  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      setError(null);
      const list = await chatService.getConversations();
      setConversations(mapConversationIds(list ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    }
  }, [chatService, isAuthenticated]);

  // Socket connection lifecycle — connects when auth flips to true, disconnects on logout.
  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      initializedUserIdRef.current = null;
      setConversations([]);
      setMessages([]);
      setError(null);
      return;
    }

    if (initializedUserIdRef.current === user.userId) {
      return;
    }

    initializedUserIdRef.current = user.userId;

    const token = tokenProvider() ?? '';
    chatService.connect(user.userId, token);

    const handleMessage = (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== message.conversationId) {
            return conv;
          }
          const isActive = activeConversationIdRef.current === conv.id;
          return {
            ...conv,
            lastMessage: message,
            updatedAt: message.timestamp,
            unreadCount: isActive ? conv.unreadCount : (conv.unreadCount ?? 0) + 1,
          };
        })
      );
    };

    const handleTyping = (data: TypingIndicator) => {
      setTypingUsers((prev) => (prev.includes(data.userName) ? prev : [...prev, data.userName]));
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
      }, TYPING_INDICATOR_CLEAR_MS);
    };

    const handleReactionUpdate = (event: ReactionUpdateEvent) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === event.messageId
            ? {
                ...msg,
                reactions: (event.reactions || []).map((r) => ({
                  userId: r.userId,
                  emoji: r.emoji,
                  createdAt: r.createdAt ?? new Date().toISOString(),
                })),
              }
            : msg
        )
      );
    };

    const handleReadStatusUpdate = (event: ReadStatusUpdateEvent) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.conversationId === event.chatId
            ? {
                ...msg,
                status: 'read' as const,
                readBy: msg.readBy?.some((r) => r.userId === event.userId)
                  ? msg.readBy
                  : [...(msg.readBy || []), { userId: event.userId, readAt: event.timestamp }],
              }
            : msg
        )
      );
      setConversations((prev) =>
        prev.map((conv) => (conv.id === event.chatId ? { ...conv, unreadCount: 0 } : conv))
      );
    };

    chatService.onMessage(handleMessage);
    chatService.onTyping(handleTyping);
    chatService.onReactionUpdate(handleReactionUpdate);
    chatService.onReadStatusUpdate(handleReadStatusUpdate);

    void loadConversations();

    return () => {
      chatService.off('message');
      chatService.off('typing');
      chatService.off('reaction');
      chatService.off('readStatus');
      chatService.disconnect();
      initializedUserIdRef.current = null;
    };
  }, [isAuthenticated, user?.userId, chatService, tokenProvider, loadConversations]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setCurrentPage(1);
      setHasMoreMessages(true);
      setIsLoading(true);
      setError(null);
      try {
        const response = await chatService.getMessages(conversationId, {
          page: 1,
          limit: MESSAGES_PAGE_SIZE,
        });
        const list = Array.isArray(response?.data) ? response.data : [];
        setMessages(list);
        if (list.length < MESSAGES_PAGE_SIZE) {
          setHasMoreMessages(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatService]
  );

  const loadMoreMessages = useCallback(async () => {
    if (!activeConversation || !hasMoreMessages || isLoadingMoreMessages) {
      return;
    }
    setIsLoadingMoreMessages(true);
    setError(null);
    try {
      const nextPage = currentPage + 1;
      const response = await chatService.getMessages(activeConversation.id, {
        page: nextPage,
        limit: MESSAGES_PAGE_SIZE,
      });
      const list = Array.isArray(response?.data) ? response.data : [];
      if (list.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      setMessages((prev) => [...list, ...prev]);
      setCurrentPage(nextPage);
      if (list.length < MESSAGES_PAGE_SIZE) {
        setHasMoreMessages(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [activeConversation, chatService, currentPage, hasMoreMessages, isLoadingMoreMessages]);

  const sendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!activeConversation || !user) {
        return;
      }

      if (offlineAdapter && !isOnline) {
        const tempId = offlineAdapter.queueMessageForOffline(activeConversation.id, content);
        const tempMessage: Message = {
          id: tempId,
          conversationId: activeConversation.id,
          senderId: user.userId,
          senderName: user.firstName ?? '',
          content,
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'sending',
        };
        setMessages((prev) => [...prev, tempMessage]);
        setError("Message queued for when you're back online");
        return;
      }

      try {
        setError(null);
        if (attachments && attachments.length > 0) {
          for (const file of attachments) {
            await chatService.uploadAttachment(activeConversation.id, file);
          }
        }
        const sent = await chatService.sendMessage(activeConversation.id, content);
        setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation.id
              ? { ...conv, lastMessage: sent, updatedAt: sent.timestamp }
              : conv
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send message';
        setError(msg);
      }
    },
    [activeConversation, chatService, isOnline, offlineAdapter, user]
  );

  const markAsRead = useCallback(
    async (conversationId: string) => {
      try {
        await chatService.markAsRead(conversationId);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    },
    [chatService]
  );

  const startConversation = useCallback(
    async (rescueId: string, petId?: string): Promise<Conversation> => {
      setError(null);
      try {
        const conversation = await chatService.createConversation({ rescueId, petId });
        setConversations((prev) => [conversation, ...prev]);
        return conversation;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create conversation';
        setError(msg);
        throw err;
      }
    },
    [chatService]
  );

  const startTyping = useCallback(
    (conversationId: string) => chatService.startTyping(conversationId),
    [chatService]
  );

  const stopTyping = useCallback(
    (conversationId: string) => chatService.stopTyping(conversationId),
    [chatService]
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeConversation || !user) {
        return;
      }
      const targetMessage = messages.find((m) => m.id === messageId);
      const hasReacted = targetMessage?.reactions?.some(
        (r) => r.userId === user.userId && r.emoji === emoji
      );

      const op = hasReacted
        ? chatService.removeReaction(activeConversation.id, messageId, emoji)
        : chatService.addReaction(activeConversation.id, messageId, emoji);
      op.catch((err) => console.error('Failed to toggle reaction:', err));

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) {
            return msg;
          }
          const current = msg.reactions || [];
          if (hasReacted) {
            return {
              ...msg,
              reactions: current.filter((r) => !(r.userId === user.userId && r.emoji === emoji)),
            };
          }
          return {
            ...msg,
            reactions: [
              ...current,
              { userId: user.userId, emoji, createdAt: new Date().toISOString() },
            ],
          };
        })
      );
    },
    [activeConversation, chatService, messages, user]
  );

  const handleSetActiveConversation = useCallback(
    (conversation: Conversation | null) => {
      setActiveConversation(conversation);
      setTypingUsers([]);
      if (!conversation) {
        setMessages([]);
        lastMarkedAsReadRef.current = null;
        lastLoadedMessagesRef.current = null;
        return;
      }
      if (lastLoadedMessagesRef.current !== conversation.id) {
        void loadMessages(conversation.id);
        lastLoadedMessagesRef.current = conversation.id;
      }
      if (lastMarkedAsReadRef.current !== conversation.id) {
        void markAsRead(conversation.id);
        lastMarkedAsReadRef.current = conversation.id;
      }
    },
    [loadMessages, markAsRead]
  );

  const forceSyncOfflineData = useCallback(async () => {
    if (!offlineAdapter || !isOnline) {
      return;
    }
    try {
      await offlineAdapter.forceSync();
    } catch (err) {
      console.error('Failed to force sync offline data:', err);
      setError('Failed to sync offline messages');
    }
  }, [isOnline, offlineAdapter]);

  // Wire offline adapter state changes into React state.
  useEffect(() => {
    if (!offlineAdapter) {
      return;
    }
    const listener = (state: OfflineState) => {
      setIsOnline(state.isOnline);
      setConnectionQuality(state.connectionQuality);
      setPendingMessageCount(state.pendingMessages.length + state.pendingActions.length);
    };
    offlineAdapter.onOfflineStateChange(listener);

    offlineAdapter.setSyncCallback(
      async (
        pendingMessages: ReadonlyArray<PendingMessage>,
        pendingActions: ReadonlyArray<PendingAction>
      ) => {
        for (const message of pendingMessages) {
          try {
            await chatService.sendMessage(message.conversationId, message.content);
            offlineAdapter.removeQueuedMessage(message.id);
          } catch (err) {
            console.error('Failed to sync queued message:', err);
          }
        }
        for (const action of pendingActions) {
          try {
            if (action.type === 'mark_read') {
              await chatService.markAsRead(action.conversationId);
            } else if (action.type === 'typing_start') {
              chatService.startTyping(action.conversationId);
            } else if (action.type === 'typing_stop') {
              chatService.stopTyping(action.conversationId);
            }
            offlineAdapter.removeQueuedAction(action.id);
          } catch (err) {
            console.error('Failed to sync queued action:', err);
          }
        }
      }
    );

    return () => {
      offlineAdapter.removeOfflineStateListener(listener);
    };
  }, [chatService, offlineAdapter]);

  const unreadMessageCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [conversations]
  );

  const resolvedFeatureFlags = featureFlags ?? DEFAULT_FEATURE_FLAGS;
  const resolvedResolveFileUrl = resolveFileUrl ?? DEFAULT_RESOLVE_FILE_URL;

  const value: ChatContextValue = {
    currentUser: user,
    isAuthenticated,
    featureFlags: resolvedFeatureFlags,
    resolveFileUrl: resolvedResolveFileUrl,
    conversations,
    activeConversation,
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    hasMoreMessages,
    isLoadingMoreMessages,
    connectionStatus,
    isReconnecting,
    reconnectionAttempts,
    isOnline,
    connectionQuality,
    pendingMessageCount,
    unreadMessageCount,
    setActiveConversation: handleSetActiveConversation,
    sendMessage,
    markAsRead,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    startConversation,
    startTyping,
    stopTyping,
    toggleReaction,
    forceSyncOfflineData,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
