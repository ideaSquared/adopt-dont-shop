import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';

const MessageListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  padding: 1.2rem 0.5rem 1.2rem 0.5rem;
  background: ${props => props.theme.background.primary};
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.primary[100]}
    ${props => props.theme.background.primary};

  &::-webkit-scrollbar {
    width: 8px;
    background: ${props => props.theme.background.primary};
  }
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.primary[100]};
    border-radius: 8px;
  }
`;

const MessageItem = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  gap: 0.1rem;
  width: 100%;
`;

const MessageRow = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  gap: 0.5rem;
  width: 100%;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary[100]},
    ${props => props.theme.colors.primary[300]}
  );
  color: ${props => props.theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.15rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-right: 0.4rem;
  border: 2px solid ${props => props.theme.colors.primary[300]};
  user-select: none;
  aria-label: 'Sender initials';
`;

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
  width: 100%;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 90%;
  min-width: 110px;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.85rem 1.2rem 0.5rem 1.2rem;
  border-radius: 1.2rem;
  background: ${props =>
    props.$isOwn
      ? `linear-gradient(135deg, ${props.theme.colors.primary[400]}, ${props.theme.colors.primary[600]})`
      : props.theme.background.secondary};
  color: ${props => (props.$isOwn ? props.theme.text.primary : props.theme.colors.primary[700])};
  word-break: break-word;
  overflow-wrap: anywhere;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.09);
  font-size: 1rem;
  position: relative;
  transition:
    background 0.2s,
    color 0.2s;
  border: ${props => (props.$isOwn ? 'none' : `1.5px solid ${props.theme.colors.primary[200]}`)};
  outline: none;
  cursor: text;
  &:focus {
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary[200]};
  }
  @media (max-width: 600px) {
    max-width: 98%;
    min-width: 80px;
    font-size: 0.98rem;
    padding: 0.7rem 0.7rem 0.4rem 0.7rem;
  }
`;

const MessageInfo = styled.div<{ $isOwn: boolean }>`
  align-self: flex-end;
  margin-top: 0.25rem;
  font-size: 0.74rem;
  color: ${props => props.theme.text.secondary};
  opacity: 0.8;
  padding: 0 0.2rem;
  text-align: right;
  white-space: nowrap;
  letter-spacing: 0.01em;
  user-select: none;
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
          if (message.senderName) {
            initials = message.senderName
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
              {!isOwn && <Avatar aria-label={'Sender initials'}>{initials}</Avatar>}
              <MessageBubbleWrapper $isOwn={isOwn}>
                <MessageBubble
                  $isOwn={isOwn}
                  tabIndex={0}
                  aria-label={isOwn ? 'Your message' : 'Received message'}
                >
                  <span
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {message.content}
                  </span>
                  <MessageInfo $isOwn={isOwn} aria-label={'Message time'}>
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
