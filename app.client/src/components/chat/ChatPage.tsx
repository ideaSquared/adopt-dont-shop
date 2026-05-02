import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useChat } from '@/contexts/ChatContext';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { ChatWindow, ConnectionStatusBanner, ConversationList } from '@adopt-dont-shop/lib.chat';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as styles from './ChatPage.css';

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, activeConversation, setActiveConversation, isLoading, error } = useChat();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const lastSetConversationId = useRef<string | null>(null);

  // Set active conversation from URL
  useEffect(() => {
    if (conversationId && conversationId !== lastSetConversationId.current && conversations) {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setActiveConversation(conversation);
        lastSetConversationId.current = conversationId;
      }
    } else if (!conversationId && lastSetConversationId.current) {
      // Clear active conversation when no conversationId in URL
      setActiveConversation(null);
      lastSetConversationId.current = null;
    }
  }, [conversationId, conversations, setActiveConversation]);

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.loginPrompt}>
          <h2>🔐 Login Required</h2>
          <p>
            Please log in to access your messages. Connect with rescue organizations and stay
            updated on your adoption applications.
          </p>
          <Link className={styles.ctaButton} to='/login'>
            Sign In to View Messages
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.errorMessage}>Error loading chat: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <h1>Messages</h1>
        <p>Connect with rescue organizations about pet adoptions</p>
      </div>

      <ConnectionStatusBanner />

      {isLoading && (!conversations || conversations.length === 0) ? (
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      ) : (
        <div className={styles.chatLayout}>
          {/* Desktop View - Always show both panels */}
          <div className={styles.desktopView}>
            <div className={styles.conversationPanel}>
              <ConversationList
                emptyStateDescription="Start a conversation with a rescue organization when you're interested in a pet."
                emptyAction={{ label: 'Discover Pets', onClick: () => navigate('/discover') }}
                onConversationSelect={c => navigate(`/chat/${c.id}`)}
              />
            </div>
            <div className={styles.divider} />
            <ChatWindow onBack={() => navigate('/chat')} />
          </div>

          {/* Mobile View - Show conversation list or chat window */}
          <div className={styles.mobileConversationView}>
            {!activeConversation || !conversationId ? (
              <ConversationList
                emptyStateDescription="Start a conversation with a rescue organization when you're interested in a pet."
                emptyAction={{ label: 'Discover Pets', onClick: () => navigate('/discover') }}
                onConversationSelect={c => navigate(`/chat/${c.id}`)}
              />
            ) : (
              <ChatWindow onBack={() => navigate('/chat')} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
