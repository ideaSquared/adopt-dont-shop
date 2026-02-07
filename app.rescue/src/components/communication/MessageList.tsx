import { useAuth } from '@adopt-dont-shop/lib.auth';
import { Message } from '@adopt-dont-shop/lib.chat';
import styled from 'styled-components';
import { MessageItemComponent } from './MessageItemComponent';

interface MessageListProps {
  messages: Message[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const MessageListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem 0.75rem;
  background: ${props => props.theme.background.primary};
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.neutral[300]}
    ${props => props.theme.background.primary};

  &::-webkit-scrollbar {
    width: 6px;
    background: ${props => props.theme.background.primary};
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.neutral[300]};
    border-radius: 6px;
    transition: background 0.15s ease;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.neutral[400]};
  }
`;

const EmptyMessages = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: ${props => props.theme.text.secondary};
  padding: 2.5rem 0.5rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.text.primary};
    font-size: 1.18rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  p {
    margin: 0;
    font-size: 1.01rem;
    color: ${props => props.theme.text.secondary};
  }
`;

export function MessageList({ messages, onToggleReaction }: MessageListProps) {
  const { user } = useAuth();

  // Defensive check to ensure messages is an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  if (safeMessages.length === 0) {
    return (
      <EmptyMessages>
        <h4>No messages yet</h4>
        <p>Start the conversation by sending a message below</p>
      </EmptyMessages>
    );
  }

  return (
    <MessageListWrapper>
      {safeMessages.map(message => {
        const isOwn = message.senderId === user?.userId;
        return (
          <MessageItemComponent
            key={message.id}
            message={message}
            isOwn={isOwn}
            currentUserId={user?.userId}
            onToggleReaction={onToggleReaction}
          />
        );
      })}
    </MessageListWrapper>
  );
}
