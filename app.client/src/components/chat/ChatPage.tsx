import { useChat } from '@/contexts/ChatContext';
import { Container, Spinner } from '@adopt-dont-shop/components';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ChatWindow } from './ChatWindow';
import { ConversationList } from './ConversationList';

const ChatContainer = styled(Container)`
  min-height: calc(100vh - 120px);
  padding: 1rem 0;
  max-width: 1200px;
`;

const ChatLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  height: calc(100vh - 160px);
  background: ${props => props.theme.background.secondary};
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: calc(100vh - 140px);
  }
`;

const MobileConversationView = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`;

const DesktopView = styled.div`
  display: contents;

  @media (max-width: 768px) {
    display: none;
  }
`;

const Header = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;

  h1 {
    font-size: 2rem;
    color: ${props => props.theme.text.primary};
    margin: 0;
  }

  p {
    color: ${props => props.theme.text.secondary};
    margin: 0.5rem 0 0 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.semantic.error[50]};
  color: ${props => props.theme.colors.semantic.error[700]};
  border: 1px solid ${props => props.theme.colors.semantic.error[200]};
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem;
  text-align: center;
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
            <ConversationList />
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
