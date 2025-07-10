import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';

const MessageListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
`;

const MessageItem = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  gap: 0.1rem;
`;

const MessageRow = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  gap: 0.5rem;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 8px;
  background: ${props => props.theme.background.secondary};
  color: ${props => props.theme.colors.primary.main};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
  margin-right: 0.2rem;
  border: 1.5px solid ${props => props.theme.colors.primary.main};
`;

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 70%;
  padding: 0.85rem 1.15rem 1.3rem 1.15rem;
  border-radius: 1.2rem;
  background: ${props =>
    props.$isOwn ? props.theme.colors.primary.main : props.theme.background.secondary};
  color: ${props => (props.$isOwn ? props.theme.text.light : props.theme.colors.primary.main)};
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  font-size: 1.05rem;
  position: relative;
  transition: background 0.2s;
  border: ${props => (props.$isOwn ? 'none' : `1.5px solid ${props.theme.colors.primary.main}`)};
`;

const MessageInfo = styled.div<{ $isOwn: boolean }>`
  position: absolute;
  right: 1rem;
  bottom: 0.35rem;
  font-size: 0.72rem;
  color: ${props => props.theme.text.secondary};
  opacity: 0.7;
  margin: 0;
  padding: 0;
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
    font-size: 1.1rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 1rem;
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
    <MessageListWrapper>
      {messages.map(message => {
        const isOwn = message.senderId === user?.userId;
        let initials = '';
        if (!isOwn) {
          const senderName = (message as { senderName?: string }).senderName;
          if (senderName) {
            initials = senderName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
          } else {
            initials = (message.senderId || '?').toString().slice(0, 2).toUpperCase();
          }
        }
        return (
          <MessageItem key={message.id} $isOwn={isOwn}>
            <MessageRow $isOwn={isOwn}>
              {!isOwn && <Avatar>{initials}</Avatar>}
              <MessageBubbleWrapper $isOwn={isOwn}>
                <MessageBubble $isOwn={isOwn}>
                  {message.content}
                  <MessageInfo $isOwn={isOwn}>
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </MessageInfo>
                </MessageBubble>
              </MessageBubbleWrapper>
            </MessageRow>
          </MessageItem>
        );
      })}
    </MessageListWrapper>
  );
}
