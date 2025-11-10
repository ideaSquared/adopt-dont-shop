import { useAuth } from '@adopt-dont-shop/lib-auth';
import { useChat } from '@/contexts/ChatContext';
import { Spinner } from '@adopt-dont-shop/components';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 100%;
  margin: 0 auto;
  background: ${props => props.theme.background.primary};
  overflow: hidden;

  @media (max-width: 768px) {
    height: 100vh;
  }
`;

const ChatLayout = styled.div`
  flex: 1 1 0%;
  display: flex;
  min-height: 0;
  background: ${props => props.theme.background.secondary};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid ${props => props.theme.border.color.secondary};

  @media (max-width: 768px) {
    flex-direction: column;
    border-radius: 0;
    border: none;
    box-shadow: none;
  }
`;

const Divider = styled.div`
  width: 1px;
  background: ${props => props.theme.border.color.secondary};
  opacity: 0.5;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileConversationView = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    height: 100%;
    width: 100vw;
    background: ${props => props.theme.background.primary};
  }
`;

const DesktopView = styled.div`
  display: flex;
  flex: 1 1 0%;
  min-width: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ConversationPanel = styled.div`
  width: 320px;
  min-width: 260px;
  max-width: 380px;
  flex-shrink: 0;
  background: ${props => props.theme.background.primary};
  border-right: 1px solid ${props => props.theme.border.color.secondary};
  height: 100%;
  overflow-y: auto;
  z-index: 1;

  @media (max-width: 1024px) {
    width: 240px;
    min-width: 180px;
  }

  @media (max-width: 768px) {
    width: 100vw;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  }
`;

const Header = styled.div`
  padding: 1.5rem 2rem 1rem 2rem;
  background: ${props => props.theme.background.primary};
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};

  h1 {
    margin: 0 0 0.25rem 0;
    font-size: 1.75rem;
    font-weight: 800;
    color: ${props => props.theme.text.primary};
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    font-size: 1rem;
    color: ${props => props.theme.text.secondary};
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    padding: 1.25rem 1rem 0.875rem 1rem;

    h1 {
      font-size: 1.5rem;
    }

    p {
      font-size: 0.9375rem;
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background: ${props => props.theme.background.secondary};
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.semantic.error[100]};
  color: ${props => props.theme.colors.semantic.error[800]};
  border: 1px solid ${props => props.theme.colors.semantic.error[300]};
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem auto;
  text-align: center;
  max-width: 400px;
  font-size: 1.1rem;
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 12px;
  margin: 2rem 0;

  h2 {
    font-size: 1.8rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
    margin-bottom: 2rem;
    line-height: 1.6;
  }
`;

const CTAButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  background: ${props => props.theme.colors.primary[600]};
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[700]};
    transform: translateY(-1px);
  }
`;

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, activeConversation, setActiveConversation, isLoading, error } = useChat();
  const { isAuthenticated } = useAuth();
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
      <ChatContainer>
        <LoginPrompt>
          <h2>🔐 Login Required</h2>
          <p>
            Please log in to access your messages. Connect with rescue organizations and stay
            updated on your adoption applications.
          </p>
          <CTAButton to='/login'>Sign In to View Messages</CTAButton>
        </LoginPrompt>
      </ChatContainer>
    );
  }

  if (error) {
    return (
      <ChatContainer>
        <ErrorMessage>Error loading chat: {error}</ErrorMessage>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer>
      <Header>
        <h1>Messages</h1>
        <p>Connect with rescue organizations about pet adoptions</p>
      </Header>

      {isLoading && (!conversations || conversations.length === 0) ? (
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      ) : (
        <ChatLayout>
          {/* Desktop View - Always show both panels */}
          <DesktopView>
            <ConversationPanel>
              <ConversationList />
            </ConversationPanel>
            <Divider />
            <ChatWindow />
          </DesktopView>

          {/* Mobile View - Show conversation list or chat window */}
          <MobileConversationView>
            {!activeConversation || !conversationId ? <ConversationList /> : <ChatWindow />}
          </MobileConversationView>
        </ChatLayout>
      )}
    </ChatContainer>
  );
}
