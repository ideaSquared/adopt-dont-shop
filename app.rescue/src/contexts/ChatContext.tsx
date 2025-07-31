import { ChatService, Conversation, Message, TypingIndicator } from '@adopt-dont-shop/lib-chat';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';

interface ChatContextType {
  chatService: ChatService;
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
  userId?: string;
}

export const ChatProvider = ({ children, userId }: ChatProviderProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const chatService = useMemo(() => {
    return new ChatService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
    });
  }, []);

  useEffect(() => {
    if (userId) {
      const token = localStorage.getItem('accessToken') || '';
      chatService.connect(userId, token);
      setIsConnected(true);

      // Set up socket event listeners
      const handleMessage = (message: Message) => {
        setMessages(prev => [...prev, message]);
      };

      const handleTyping = (data: TypingIndicator) => {
        setTypingUsers(prev => {
          if (prev.includes(data.userName)) return prev;
          return [...prev, data.userName];
        });

        // Auto-remove user after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== data.userName));
        }, 3000);
      };

      chatService.onMessage(handleMessage);
      chatService.onTyping(handleTyping);

      return () => {
        chatService.disconnect();
        setIsConnected(false);
      };
    }
  }, [userId, chatService]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [userId, chatService]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await chatService.getMessages(conversationId);
      setMessages(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [chatService]);

  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!activeConversation) return;

    try {
      setError(null);
      
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          await chatService.uploadAttachment(activeConversation.id, file);
        }
      }

      const message = await chatService.sendMessage(activeConversation.id, content);
      setMessages(prev => [...prev, message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [activeConversation, chatService]);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await chatService.markAsRead(conversationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [chatService]);

  const startConversation = useCallback(async (rescueId: string, petId?: string): Promise<Conversation> => {
    try {
      setError(null);
      const conversation = await chatService.createConversation({
        rescueId,
        petId,
      });
      setConversations(prev => [conversation, ...prev]);
      return conversation;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(error);
      throw new Error(error);
    }
  }, [chatService]);

  const startTyping = useCallback((conversationId: string) => {
    chatService.startTyping(conversationId);
  }, [chatService]);

  const stopTyping = useCallback((conversationId: string) => {
    chatService.stopTyping(conversationId);
  }, [chatService]);

  const handleSetActiveConversation = useCallback((conversation: Conversation | null) => {
    setActiveConversation(conversation);
    setTypingUsers([]);
    if (conversation) {
      loadMessages(conversation.id);
      markAsRead(conversation.id);
    } else {
      setMessages([]);
    }
  }, [loadMessages, markAsRead]);

  const value = useMemo(() => ({
    chatService,
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
  }), [
    chatService,
    conversations,
    activeConversation,
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    handleSetActiveConversation,
    sendMessage,
    markAsRead,
    loadConversations,
    loadMessages,
    startConversation,
    startTyping,
    stopTyping,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
