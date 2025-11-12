import {
  Conversation as LibConversation,
  chatService,
  Message as LibMessage,
  TypingIndicator,
} from '@/services';
import {
  getConnectionQuality,
  isCurrentlyOnline,
  offlineManager,
  onOfflineStateChange,
  queueMessageForOffline,
  removeOfflineStateListener,
  type OfflineState,
} from '@/utils/offlineManager';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@adopt-dont-shop/lib-auth';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;

  // Offline state
  isOnline: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  pendingMessageCount: number;

  // Actions
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  startConversation: (rescueId: string, petId?: string) => Promise<Conversation>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  forceSyncOfflineData: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Offline state
  const [isOnline, setIsOnline] = useState(isCurrentlyOnline());
  const [connectionQuality, setConnectionQuality] = useState(getConnectionQuality());
  const [pendingMessageCount, setPendingMessageCount] = useState(0);

  const initializedRef = useRef<string | null>(null);
  const lastMarkedAsReadRef = useRef<string | null>(null);
  const lastLoadedMessagesRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    const result = await handleAsyncAction(() => chatService.getConversations(), {
      setError,
      onError: error => console.error('Failed to load conversations:', error),
    });

    if (result) {
      // Map chat_id to id for frontend compatibility
      const mappedConversations = (result || []).map(
        (conv: BaseConversation & { chat_id?: string }) =>
          ({
            ...conv,
            id: conv.id || conv.chat_id,
          }) as Conversation
      );
      setConversations(mappedConversations);
    }
  }, [isAuthenticated]);

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.userId && initializedRef.current !== user.userId) {
      initializedRef.current = user.userId;

      const token = localStorage.getItem('accessToken') || '';
      chatService.connect(user.userId, token);
      setIsConnected(true);

      // Set up socket event listeners
      const handleMessage = (message: Message) => {
        // Prevent duplicate messages by checking if message already exists
        setMessages(prev => {
          const currentMessages = prev || [];
          // Check if message already exists (by ID)
          const messageExists = currentMessages.some(msg => msg.id === message.id);
          if (messageExists) {
            return currentMessages; // Don't add duplicate
          }
          return [...currentMessages, message];
        });

        // Update conversation list with latest message
        setConversations(prev =>
          (prev || []).map(conv =>
            conv.id === message.conversationId
              ? { ...conv, lastMessage: message, updatedAt: message.timestamp }
              : conv
          )
        );
      };

      const handleTyping = (data: TypingIndicator) => {
        // Add user to typing users when we receive a typing indicator
        setTypingUsers(prev => {
          const currentUsers = prev || [];
          if (currentUsers.includes(data.userName)) return currentUsers;
          return [...currentUsers, data.userName];
        });

        // Auto-remove user after 3 seconds of no typing indicator
        setTimeout(() => {
          setTypingUsers(prev => (prev || []).filter(name => name !== data.userName));
        }, 3000);
      };

      chatService.onMessage(handleMessage);
      chatService.onTyping(handleTyping);

      // Load initial conversations - call directly to avoid dependency loop
      const loadInitialConversations = async () => {
        // Only load if user is authenticated
        if (!isAuthenticated || !user?.userId) {
          console.log('⚠️ ChatContext: Skipping conversation load - user not authenticated');
          return;
        }

        try {
          setIsLoading(true);
          setError(null);
          console.log('📞 ChatContext: Loading conversations for authenticated user');
          const conversationList = await chatService.getConversations();
          // Map chat_id to id for frontend compatibility
          const mappedConversations = (conversationList || []).map(
            (conv: ConversationApiResponse) =>
              ({
                ...conv,
                id: conv.id || conv.chat_id,
              }) as Conversation
          );
          setConversations(mappedConversations);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load conversations');
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialConversations();

      return () => {
        // Clean up socket event listeners
        chatService.off('message');
        chatService.off('typing');
        chatService.disconnect();
        setIsConnected(false);
        initializedRef.current = null;
      };
    } else if (!isAuthenticated) {
      // Reset when user logs out
      initializedRef.current = null;
      setIsConnected(false);
      setConversations([]);
      setMessages([]);
      setError(null);
    }
  }, [isAuthenticated, user?.userId]); // Only depend on auth state and userId

  const loadMessages = async (conversationId: string) => {
    setCurrentPage(1);
    setHasMoreMessages(true);

    const messageData = await handleAsyncAction(
      () =>
        chatService.getMessages(conversationId, {
          page: 1,
          limit: 50,
        }),
      {
        setError,
        setLoading: setIsLoading,
        onError: error => console.error('Failed to load messages:', error),
      }
    );

    if (!messageData.data) {
      console.warn('No data array in response, using empty array');
      setMessages([]);
      return;
    }

    // Ensure messageData.data is an array
    const messagesArray = Array.isArray(messageData.data) ? messageData.data : [];
    setMessages(messagesArray);

    // Check if there are more messages to load
    if (messageData.data.length < 50) {
      setHasMoreMessages(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!activeConversation || !hasMoreMessages || isLoadingMoreMessages) return;

    try {
      setIsLoadingMoreMessages(true);
      setError(null);
      const nextPage = currentPage + 1;

      const messageData = await chatService.getMessages(activeConversation.id, {
        page: nextPage,
        limit: 50,
      });

      if (!messageData || !messageData.data) {
        console.warn('No message data received, stopping pagination');
        setHasMoreMessages(false);
        return;
      }

      // Ensure messageData.data is an array
      const messagesArray = Array.isArray(messageData.data) ? messageData.data : [];

      if (messagesArray.length === 0) {
        setHasMoreMessages(false);
      } else {
        // Prepend older messages to the beginning of the array
        setMessages(prev => [...messagesArray, ...(prev || [])]);
        setCurrentPage(nextPage);

        if (messagesArray.length < 50) {
          setHasMoreMessages(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more messages';
      setError(errorMessage);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  const sendMessage = async (content: string, attachments?: File[]) => {
    if (!activeConversation || !user) return;

    // Handle offline case first
    if (!isOnline) {
      const tempId = queueMessageForOffline(activeConversation.id, content);

      // Add temporary message to UI for immediate feedback
      const tempMessage: Message = {
        id: tempId,
        conversationId: activeConversation.id,
        senderId: user.userId,
        senderName: user.firstName,
        content,
        timestamp: new Date().toISOString(),
        type: 'text',
        status: 'sending',
      };

      setMessages(prev => [...(prev || []), tempMessage]);
      setError("📡 Message queued for when you're back online");
      return;
    }

    // Handle online message sending
    const result = await handleAsyncAction(
      async () => {
        if (attachments && attachments.length > 0) {
          // Handle file attachments
          for (const file of attachments) {
            await chatService.uploadAttachment(activeConversation.id, file);
          }
        }

        // Send message and get the response
        return await chatService.sendMessage(activeConversation.id, content);
      },
      {
        setError,
        onError: error => {
          // Check if it's a rate limit error and provide specific feedback
          if (error.message.includes('Rate limit exceeded')) {
            setError(`⚠️ ${error.message}`);
          } else {
            console.error('Failed to send message:', error);
          }
        },
      }
    );

    if (result) {
      // Add message to local state immediately (don't wait for socket)
      setMessages(prev => [...(prev || []), result]);

      // Update conversation with latest message
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id
            ? { ...conv, lastMessage: sentMessage, updatedAt: sentMessage.timestamp }
            : conv
        )
      );
    }
  };

  const markAsRead = async (conversationId: string) => {
    await handleAsyncAction(() => chatService.markAsRead(conversationId), {
      onError: error => console.error('Failed to mark as read:', error),
    });
  };

  const startConversation = async (rescueId: string, petId?: string): Promise<Conversation> => {
    try {
      setError(null);

      const conversation = await chatService.createConversation({
        rescueId,
        petId,
      });

      setConversations(prev => [conversation, ...(prev || [])]);
      return conversation;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  const startTyping = useCallback((conversationId: string) => {
    chatService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    chatService.stopTyping(conversationId);
  }, []);

  const handleSetActiveConversation = (conversation: Conversation | null) => {
    setActiveConversation(conversation);
    setTypingUsers([]); // Clear typing indicators when switching conversations
    if (conversation) {
      // Only load messages if it's a different conversation than the last one loaded
      if (lastLoadedMessagesRef.current !== conversation.id) {
        loadMessages(conversation.id);
        lastLoadedMessagesRef.current = conversation.id;
      }
      // Only mark as read if it's a different conversation than the last one
      if (lastMarkedAsReadRef.current !== conversation.id) {
        markAsRead(conversation.id);
        lastMarkedAsReadRef.current = conversation.id;
      }
    } else {
      setMessages([]);
      lastMarkedAsReadRef.current = null;
      lastLoadedMessagesRef.current = null;
    }
  };

  const forceSyncOfflineData = useCallback(async () => {
    if (isOnline) {
      try {
        await offlineManager.forceSync();
      } catch (error) {
        console.error('Failed to force sync offline data:', error);
        setError('Failed to sync offline messages');
      }
    }
  }, [isOnline]);

  // Offline state management
  useEffect(() => {
    const handleOfflineStateChange = (state: OfflineState) => {
      // Update all offline-related state
      setIsOnline(state.isOnline);
      setConnectionQuality(state.connectionQuality);
      setPendingMessageCount(state.pendingMessages.length + state.pendingActions.length);

      // If we just came back online, trigger sync
      if (state.isOnline && !isOnline) {
        forceSyncOfflineData();
      }
    };

    // Listen to offline manager events
    onOfflineStateChange(handleOfflineStateChange);

    return () => {
      // Clean up listeners on unmount
      removeOfflineStateListener(handleOfflineStateChange);
    };
  }, [forceSyncOfflineData, isOnline]);

  // Setup offline state management
  useEffect(() => {
    const handleOfflineStateChange = (state: OfflineState) => {
      setIsOnline(state.isOnline);
      setConnectionQuality(state.connectionQuality);
      setPendingMessageCount(state.pendingMessages.length + state.pendingActions.length);
    };

    // Set up sync callback for offline manager
    offlineManager.setSyncCallback(async (messages, actions) => {
      // Process pending messages
      for (const message of messages) {
        try {
          await chatService.sendMessage(message.conversationId, message.content);
          offlineManager.removeQueuedMessage(message.id);
        } catch (error) {
          console.error('Failed to sync message:', error);
          // Message will be retried automatically by offline manager
        }
      }

      // Process pending actions
      for (const action of actions) {
        try {
          if (action.type === 'mark_read') {
            await chatService.markAsRead(action.conversationId);
          } else if (action.type === 'typing_start') {
            chatService.startTyping(action.conversationId);
          } else if (action.type === 'typing_stop') {
            chatService.stopTyping(action.conversationId);
          }
          offlineManager.removeQueuedAction(action.id);
        } catch (error) {
          console.error('Failed to sync action:', error);
          // Action will be retried automatically by offline manager
        }
      }
    });

    onOfflineStateChange(handleOfflineStateChange);

    return () => {
      removeOfflineStateListener(handleOfflineStateChange);
    };
  }, []);

  const value: ChatContextType = {
    conversations,
    activeConversation,
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    hasMoreMessages,
    isLoadingMoreMessages,
    isOnline,
    connectionQuality,
    pendingMessageCount,
    setActiveConversation: handleSetActiveConversation,
    sendMessage,
    markAsRead,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    startConversation,
    startTyping,
    stopTyping,
    forceSyncOfflineData,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Define a type for API response that may include chat_id
interface ConversationApiResponse extends LibConversation {
  chat_id?: string;
}

// Use library types directly
export type Conversation = LibConversation;
export type Message = LibMessage;
