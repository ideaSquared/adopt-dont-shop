import {
  Conversation,
  Message,
  TypingIndicator,
  type ReactionUpdateEvent,
  type ReadStatusUpdateEvent,
} from '@adopt-dont-shop/lib.chat';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { chatService, useConnectionStatus } from '../services/libraryServices';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;

  // Socket.IO connection status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectionAttempts: number;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const initializedRef = useRef<string | null>(null);

  // Use Socket.IO connection status hook
  const {
    status: connectionStatus,
    isConnected,
    isReconnecting,
    reconnectionAttempts,
  } = useConnectionStatus(chatService);

  // Initialize Socket.IO connection when user is authenticated
  useEffect(() => {
    if (user?.userId && initializedRef.current !== user.userId) {
      initializedRef.current = user.userId;

      const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
      chatService.connect(user.userId, token);

      // Set up Socket.IO event listeners
      const handleMessage = (message: Message) => {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === message.id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });

        setConversations(prev =>
          prev.map(conv =>
            conv.id === message.conversationId
              ? { ...conv, lastMessage: message, updatedAt: message.timestamp }
              : conv
          )
        );
      };

      const handleTyping = (data: TypingIndicator) => {
        setTypingUsers(prev => {
          if (prev.includes(data.userName)) {
            return prev;
          }
          return [...prev, data.userName];
        });

        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.userName));
        }, 3000);
      };

      const handleReactionUpdate = (event: ReactionUpdateEvent) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === event.messageId
              ? {
                  ...msg,
                  reactions: (event.reactions || []).map(r => ({
                    userId: r.userId ?? (r as unknown as { user_id: string }).user_id,
                    emoji: r.emoji,
                    createdAt:
                      r.createdAt ??
                      (r as unknown as { created_at: string }).created_at ??
                      new Date().toISOString(),
                  })),
                }
              : msg
          )
        );
      };

      const handleReadStatusUpdate = (event: ReadStatusUpdateEvent) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.conversationId === event.chatId
              ? {
                  ...msg,
                  status: 'read' as const,
                  readBy: [
                    ...(msg.readBy || []),
                    ...(msg.readBy?.some(r => r.userId === event.userId)
                      ? []
                      : [{ userId: event.userId, readAt: event.timestamp }]),
                  ],
                }
              : msg
          )
        );
      };

      chatService.onMessage(handleMessage);
      chatService.onTyping(handleTyping);
      chatService.onReactionUpdate(handleReactionUpdate);
      chatService.onReadStatusUpdate(handleReadStatusUpdate);

      return () => {
        chatService.off('message');
        chatService.off('typing');
        chatService.off('reaction');
        chatService.off('readStatus');
        chatService.disconnect();
        initializedRef.current = null;
      };
    } else if (!user) {
      initializedRef.current = null;
      setConversations([]);
      setMessages([]);
    }
  }, [user?.userId]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.email) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      try {
        const userConversations = await chatService.getConversations();
        setConversations(userConversations);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user?.email]);

  // Load messages when active conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation) {
        setMessages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const conversationMessages = await chatService.getMessages(activeConversation.id);
        setMessages(conversationMessages.data);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setError(error instanceof Error ? error.message : 'Failed to load messages');
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [activeConversation]);

  const setActiveConversation = (conversation: Conversation | null) => {
    setActiveConversationState(conversation);
    setTypingUsers([]);
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!user?.email) {
      return;
    }

    try {
      const newMessage = await chatService.sendMessage(conversationId, content);

      // Add message to local state
      setMessages(prev => [...prev, newMessage]);

      // Update conversations with new message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId || conv.chat_id === conversationId
            ? { ...conv, lastMessage: newMessage, updatedAt: newMessage.timestamp }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const startTyping = (conversationId: string) => {
    chatService.startTyping(conversationId);
  };

  const stopTyping = (conversationId: string) => {
    chatService.stopTyping(conversationId);
  };

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeConversation || !user) {
        return;
      }

      const targetMessage = messages.find(m => m.id === messageId);
      const hasReacted = targetMessage?.reactions?.some(
        r => r.userId === user.userId && r.emoji === emoji
      );

      if (hasReacted) {
        chatService.removeReaction(activeConversation.id, messageId, emoji).catch(err => {
          console.error('Failed to remove reaction:', err);
        });
      } else {
        chatService.addReaction(activeConversation.id, messageId, emoji).catch(err => {
          console.error('Failed to add reaction:', err);
        });
      }

      // Optimistic update
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id !== messageId) {
            return msg;
          }

          const currentReactions = msg.reactions || [];
          if (hasReacted) {
            return {
              ...msg,
              reactions: currentReactions.filter(
                r => !(r.userId === user.userId && r.emoji === emoji)
              ),
            };
          }

          return {
            ...msg,
            reactions: [
              ...currentReactions,
              { userId: user.userId, emoji, createdAt: new Date().toISOString() },
            ],
          };
        })
      );
    },
    [activeConversation, user, messages]
  );

  const value = {
    conversations,
    activeConversation,
    messages,
    setActiveConversation,
    sendMessage,
    isLoading,
    error,
    typingUsers,
    startTyping,
    stopTyping,
    toggleReaction,
    connectionStatus,
    isConnected,
    isReconnecting,
    reconnectionAttempts,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
