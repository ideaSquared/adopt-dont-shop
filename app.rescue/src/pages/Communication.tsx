import { useChat } from '@/contexts/ChatContext';
import styled from 'styled-components';
import { ConversationList } from '@/components/communication/ConversationList';
import { ChatWindow } from '@/components/communication/ChatWindow';
import { useEffect, useState } from 'react';

const PageContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.background.primary};
`;

const PageHeader = styled.div`
  padding: 1.5rem 2rem;
  background: ${props => props.theme.background.primary};
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};

  h1 {
    margin: 0;
    font-size: 1.875rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    letter-spacing: -0.025em;
  }

  p {
    margin: 0.5rem 0 0 0;
    color: ${props => props.theme.text.secondary};
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    padding: 1rem 1.25rem;

    h1 {
      font-size: 1.5rem;
    }

    p {
      font-size: 0.9rem;
    }
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 350px 1fr;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MobileView = styled.div<{ $showChat: boolean }>`
  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: 1fr;
    height: 100%;

    > :first-child {
      display: ${props => (props.$showChat ? 'none' : 'flex')};
    }

    > :last-child {
      display: ${props => (props.$showChat ? 'flex' : 'none')};
    }
  }
`;

export function Communication() {
  const { activeConversation } = useChat();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const showChat = isMobile && activeConversation !== null;

  return (
    <PageContainer>
      <PageHeader>
        <h1>Communication</h1>
        <p>Manage conversations with potential adopters</p>
      </PageHeader>

      <ChatContainer>
        {isMobile ? (
          <MobileView $showChat={showChat}>
            <ConversationList />
            <ChatWindow />
          </MobileView>
        ) : (
          <>
            <ConversationList />
            <ChatWindow />
          </>
        )}
      </ChatContainer>
    </PageContainer>
  );
}
