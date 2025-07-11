import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';

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

export function MessageBubbleComponent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
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
  );
}
