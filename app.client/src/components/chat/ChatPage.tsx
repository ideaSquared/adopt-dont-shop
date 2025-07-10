import { useChat } from '@/contexts/ChatContext';
import { Spinner } from '@adopt-dont-shop/components';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  background: ${props => props.theme.background.primary};
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  overflow: hidden;

  @media (max-width: 768px) {
    border-radius: 0;
    box-shadow: none;
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
  padding: 2.5rem 1rem 1.5rem 1rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.primary.light},
    ${props => props.theme.colors.primary.main}
  );
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  text-align: center;

  @media (max-width: 768px) {
    padding: 1.5rem 0.5rem 1rem 0.5rem;
  }

  h1 {
    font-size: 2.2rem;
    color: ${props => props.theme.text.primary};
    margin: 0;
    font-weight: 700;
    letter-spacing: -1px;
  }

  p {
    color: ${props => props.theme.text.secondary};
    margin: 0.5rem 0 0 0;
    font-size: 1.1rem;
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
  background: ${props => props.theme.colors.semantic.error.light};
  color: ${props => props.theme.colors.semantic.error.main};
  border: 1px solid ${props => props.theme.colors.semantic.error.dark};
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem auto;
  text-align: center;
  max-width: 400px;
  font-size: 1.1rem;
`;

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { conversations, activeConversation, setActiveConversation, isLoading, error } = useChat();
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
