import { ChatService, Conversation, Message } from '@adopt-dont-shop/lib-chat';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ChatContextType {
  chatService: ChatService;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  startTyping?: (conversationId: string) => void;
  stopTyping?: (conversationId: string) => void;
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

  const chatService = useMemo(() => {
    return new ChatService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development',
      headers: {
        get Authorization() {
          const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
          return token ? `Bearer ${token}` : '';
        }
      }
    });
  }, []);

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
  }, [chatService, user?.email]);

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
        setMessages(conversationMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setError(error instanceof Error ? error.message : 'Failed to load messages');
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [activeConversation, chatService]);

  const setActiveConversation = (conversation: Conversation | null) => {
    setActiveConversationState(conversation);
    setTypingUsers([]);
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!user?.email) return;

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
    // In a real implementation, this would send a WebSocket event
    console.log('Start typing in conversation:', conversationId);
  };

  const stopTyping = (conversationId: string) => {
    // In a real implementation, this would send a WebSocket event
    console.log('Stop typing in conversation:', conversationId);
  };

  const value = useMemo(() => ({
    chatService,
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
  }), [chatService, conversations, activeConversation, messages, isLoading, error, typingUsers]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
