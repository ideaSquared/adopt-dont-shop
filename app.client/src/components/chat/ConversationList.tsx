import { useChat } from '@/contexts/ChatContext';
import { Conversation } from '@/services';
import { Button, Spinner } from '@adopt-dont-shop/components';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// Extend Conversation type to allow rescueName from backend if present
type ConversationWithRescueName = Conversation & { rescueName?: string };

const ConversationContainer = styled.div`
  background: ${props => props.theme.background.primary};
  border-right: 1px solid ${props => props.theme.border.color.secondary};
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  }
`;

const Header = styled.div`
  padding: 1.25rem 1rem 1rem 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.tertiary};
  background: ${props => props.theme.background.primary};
  position: sticky;
  top: 0;
  z-index: 10;

  h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    letter-spacing: -0.025em;
  }
`;

const ConversationsList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ConversationItem = styled.div<{ $isActive?: boolean }>`
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${props => (props.$isActive ? props.theme.colors.primary[50] : 'transparent')};
  border-left: ${props =>
    props.$isActive ? `3px solid ${props.theme.colors.primary[500]}` : '3px solid transparent'};
  position: relative;

  &:hover {
    background: ${props => props.theme.background.secondary};
  }

  &:active {
    background: ${props => props.theme.colors.primary[50]};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${props => props.theme.border.color.tertiary};
  }
`;

const ConversationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
`;

const RescueName = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Timestamp = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.text.tertiary};
  font-weight: 500;
`;

const LastMessage = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${props => props.theme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
`;

const PetInfo = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.primary[600]};
  margin-top: 0.25rem;
  font-weight: 500;
`;

const UnreadBadge = styled.span`
  background: ${props => props.theme.colors.primary[500]};
  color: ${props => props.theme.text.inverse};
  border-radius: 12px;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  line-height: 1.2;
`;

const EmptyState = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: ${props => props.theme.text.secondary};

  h4 {
    margin: 0 0 0.75rem 0;
    color: ${props => props.theme.text.primary};
    font-size: 1.125rem;
    font-weight: 600;
  }

  p {
    margin: 0 0 1.5rem 0;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

export function ConversationList() {
  const navigate = useNavigate();
  const { conversations, activeConversation, setActiveConversation, isLoading } = useChat();

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
    navigate(`/chat/${conversation.id}`);
  };

  // Use the unreadCount property from the conversation object
  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCount || 0;
  };

  if (isLoading && (!conversations || conversations.length === 0)) {
    return (
      <ConversationContainer>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </ConversationContainer>
    );
  }

  return (
    <ConversationContainer>
      <Header>
        <h3>Conversations</h3>
      </Header>

      {!conversations || conversations.length === 0 ? (
        <EmptyState>
          <h4>No conversations yet</h4>
          <p>
            Start a conversation with a rescue organization when you&apos;re interested in a pet.
          </p>
          <Button variant='primary' size='md' onClick={() => navigate('/discover')}>
            Discover Pets
          </Button>
        </EmptyState>
      ) : (
        <ConversationsList>
          {(conversations || []).map(conversationRaw => {
            const conversation = conversationRaw as ConversationWithRescueName;
            const unreadCount = getUnreadCount(conversation);
            const isActive = activeConversation?.id === conversation.id;

            // Prefer rescueName from backend, fallback to participants, then default
            let rescueName = '';
            if (conversation.rescueName) {
              rescueName = conversation.rescueName;
            } else if (Array.isArray(conversation.participants)) {
              const rescueParticipant = conversation.participants.find(p => p.type === 'rescue');
              rescueName = rescueParticipant?.name || '';
            }
            if (!rescueName) rescueName = 'Rescue Organization';

            return (
              <ConversationItem
                key={conversation.id}
                $isActive={isActive}
                onClick={() => handleConversationClick(conversation)}
              >
                <ConversationHeader>
                  <RescueName>
                    {rescueName}
                    {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
                  </RescueName>
                  <Timestamp>
                    {conversation.updatedAt
                      ? formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })
                      : 'Recently'}
                  </Timestamp>
                </ConversationHeader>

                {conversation.lastMessage && (
                  <LastMessage>{conversation.lastMessage.content}</LastMessage>
                )}

                {conversation.petId && <PetInfo>About: Pet #{conversation.petId}</PetInfo>}
              </ConversationItem>
            );
          })}
        </ConversationsList>
      )}
    </ConversationContainer>
  );
}
