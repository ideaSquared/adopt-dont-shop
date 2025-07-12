import { Message } from '@/services/chatService';
import styled from 'styled-components';
import { AvatarComponent } from './AvatarComponent';
import { MessageBubbleComponent } from './MessageBubbleComponent';

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

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

export function MessageItemComponent({ message, isOwn }: MessageItemProps) {
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
        {!isOwn && <AvatarComponent initials={initials} />}
        <MessageBubbleComponent message={message} isOwn={isOwn} />
      </MessageRow>
    </MessageItem>
  );
}
