import { ChatService, Conversation } from '@adopt-dont-shop/lib-chat';
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ChatContextType {
  chatService: ChatService;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, conversationId: string) => Promise<void>;
  isLoading: boolean;
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
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const chatService = useMemo(() => {
    return new ChatService({
      apiUrl: import.meta.env.VITE_API_BASE_URL,
      debug: import.meta.env.NODE_ENV === 'development'
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
        // Simplified for now - set empty conversations
        setConversations([]);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [chatService, user?.email]);

  const sendMessage = async (content: string, conversationId: string) => {
    if (!user?.email) return;

    try {
      // Simplified implementation for now
      console.log(`Sending message: ${content} to conversation: ${conversationId}`);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const value = useMemo(() => ({
    chatService,
    conversations,
    activeConversation,
    setActiveConversation,
    sendMessage,
    isLoading,
  }), [chatService, conversations, activeConversation, isLoading]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
