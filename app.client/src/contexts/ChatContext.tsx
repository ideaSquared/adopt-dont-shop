import { chatService, Conversation, Message, TypingIndicator } from '@/services/chatService';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];

  // Actions
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  startConversation: (rescueId: string, petId?: string) => Promise<Conversation>;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
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
  const initializedRef = useRef<string | null>(null);
  const lastMarkedAsReadRef = useRef<string | null>(null);
  const lastLoadedMessagesRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      const conversationList = await chatService.getConversations();
      setConversations(conversationList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
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
              ? { ...conv, lastMessage: message, updatedAt: message.createdAt }
              : conv
          )
        );
      };

      const handleTyping = (data: TypingIndicator) => {
        if (data.isTyping) {
          setTypingUsers(prev => {
            const currentUsers = prev || [];
            if (currentUsers.includes(data.userName)) return currentUsers;
            return [...currentUsers, data.userName];
          });
        } else {
          setTypingUsers(prev => (prev || []).filter(name => name !== data.userName));
        }
      };

      chatService.onMessage(handleMessage);
      chatService.onTyping(handleTyping);

      // Load initial conversations - call directly to avoid dependency loop
      const loadInitialConversations = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const conversationList = await chatService.getConversations();
          setConversations(conversationList);
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
    try {
      setIsLoading(true);
      setError(null);
      const messageData = await chatService.getMessages(conversationId);

      if (!messageData) {
        throw new Error('No message data received from API');
      }

      if (!messageData.messages) {
        throw new Error('No messages array in response data');
      }

      setMessages(messageData.messages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, attachments?: File[]) => {
    if (!activeConversation || !user) return;

    try {
      setError(null);
      if (attachments && attachments.length > 0) {
        // Handle file attachments
        for (const file of attachments) {
          await chatService.uploadAttachment(activeConversation.id, file);
        }
      }

      // Send message and get the response
      const sentMessage = await chatService.sendMessage(activeConversation.id, content);

      // Add message to local state immediately (don't wait for socket)
      setMessages(prev => [...(prev || []), sentMessage]);

      // Update conversation with latest message
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id
            ? { ...conv, lastMessage: sentMessage, updatedAt: sentMessage.createdAt }
            : conv
        )
      );

      // Socket event will also fire, but we handle deduplication in handleMessage if needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await chatService.markAsRead(conversationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const startConversation = async (rescueId: string, petId?: string): Promise<Conversation> => {
    try {
      setError(null);

      const conversation = await chatService.createConversation({
        rescueId,
        petId,
        type: 'application',
      });

      setConversations(prev => [conversation, ...(prev || [])]);
      return conversation;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(error);
      throw new Error(error);
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

  const value: ChatContextType = {
    conversations,
    activeConversation,
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    setActiveConversation: handleSetActiveConversation,
    sendMessage,
    markAsRead,
    loadConversations,
    loadMessages,
    startConversation,
    startTyping,
    stopTyping,
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
