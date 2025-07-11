import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import styled from 'styled-components';

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
  width: 100%;
  margin-bottom: 0.125rem;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 75%;
  min-width: 100px;
  min-height: 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.875rem 0.375rem 0.875rem;
  border-radius: ${props => (props.$isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px')};
  background: ${props =>
    props.$isOwn ? props.theme.colors.primary[500] : props.theme.background.secondary};
  color: ${props => (props.$isOwn ? props.theme.text.inverse : props.theme.text.primary)};
  word-break: break-word;
  overflow-wrap: anywhere;
  box-shadow: ${props =>
    props.$isOwn
      ? '0 1px 2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)'
      : '0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)'};
  font-size: 0.9375rem;
  line-height: 1.4;
  position: relative;
  transition: all 0.15s ease;
  border: ${props => (props.$isOwn ? 'none' : `1px solid ${props.theme.border.color.secondary}`)};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props =>
      props.$isOwn
        ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
        : '0 2px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'};
  }

  @media (max-width: 600px) {
    max-width: 85%;
    min-width: 90px;
    font-size: 0.9rem;
    padding: 0.4375rem 0.75rem 0.3125rem 0.75rem;
  }
`;

const MessageContent = styled.div`
  word-break: break-word;
  overflow-wrap: anywhere;
  margin-bottom: 0.25rem;
`;

const MessageInfo = styled.div<{ $isOwn: boolean }>`
  align-self: flex-end;
  font-size: 0.6875rem;
  color: ${props => (props.$isOwn ? 'rgba(255, 255, 255, 0.7)' : props.theme.text.tertiary)};
  opacity: 0.9;
  text-align: right;
  white-space: nowrap;
  letter-spacing: 0.01em;
  user-select: none;
  font-weight: 500;
`;

export function MessageBubbleComponent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <MessageBubbleWrapper $isOwn={isOwn}>
      <MessageBubble
        $isOwn={isOwn}
        tabIndex={0}
        aria-label={isOwn ? 'Your message' : 'Received message'}
      >
        <MessageContent>{message.content}</MessageContent>
        <MessageInfo $isOwn={isOwn} aria-label={'Message time'}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </MessageInfo>
      </MessageBubble>
    </MessageBubbleWrapper>
  );
}
