import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MessageItem = styled.div<{ $isOwn: boolean }>`
  display: flex;
  justify-content: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  background: ${props =>
    props.$isOwn ? props.theme.colors.primary[500] : props.theme.background.secondary};
  color: ${props => (props.$isOwn ? 'white' : props.theme.text.primary)};
  word-wrap: break-word;
`;

const MessageInfo = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.text.tertiary};
  margin-top: 0.25rem;
  text-align: right;
`;

const EmptyMessages = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: ${props => props.theme.text.secondary};

  h4 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.text.primary};
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();

  if (messages.length === 0) {
    return (
      <EmptyMessages>
        <h4>No messages yet</h4>
        <p>Start the conversation by sending a message below</p>
      </EmptyMessages>
    );
  }

  return (
    <MessagesContainer>
      {messages.map(message => {
        const isOwn = message.senderId === user?.userId;

        return (
          <MessageItem key={message.id} $isOwn={isOwn}>
            <div>
              <MessageBubble $isOwn={isOwn}>{message.content}</MessageBubble>
              <MessageInfo>
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </MessageInfo>
            </div>
          </MessageItem>
        );
      })}
    </MessagesContainer>
  );
}
