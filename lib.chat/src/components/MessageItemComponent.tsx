import styled from 'styled-components';
import type { Message } from '../types';
import { AvatarComponent } from './AvatarComponent';
import { MessageBubbleComponent, type MessageGroupPosition } from './MessageBubbleComponent';

const MessageItem = styled.div<{ $isOwn: boolean; $position: MessageGroupPosition }>`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.$isOwn ? 'flex-end' : 'flex-start')};
  width: 100%;
  margin-top: ${(props) =>
    props.$position === 'first' || props.$position === 'single' ? '0.5rem' : '0.0625rem'};
`;

const MessageRow = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: ${(props) => (props.$isOwn ? 'flex-end' : 'flex-start')};
  gap: 0.5rem;
  width: 100%;
`;

/**
 * Keeps messages in the same group visually aligned when the avatar is
 * hidden on follow-up rows. Width matches AvatarComponent (40px) + gap.
 */
const AvatarSpacer = styled.div`
  width: 40px;
  flex: 0 0 auto;
`;

const SenderName = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(props) => props.theme.text.tertiary};
  margin: 0 0 0.25rem 3rem;
  letter-spacing: 0.01em;
`;

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  position?: MessageGroupPosition;
};

const computeInitials = (name: string, fallbackId: string): string => {
  if (name) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return (fallbackId || '?').toString().slice(0, 2).toUpperCase();
};

export function MessageItemComponent({
  message,
  isOwn,
  currentUserId,
  onToggleReaction,
  position = 'single',
}: MessageItemProps) {
  const showAvatar = !isOwn && (position === 'first' || position === 'single');
  const showSenderName = !isOwn && (position === 'first' || position === 'single');

  return (
    <MessageItem $isOwn={isOwn} $position={position}>
      {showSenderName && message.senderName && <SenderName>{message.senderName}</SenderName>}
      <MessageRow $isOwn={isOwn}>
        {!isOwn &&
          (showAvatar ? (
            <AvatarComponent initials={computeInitials(message.senderName, message.senderId)} />
          ) : (
            <AvatarSpacer aria-hidden />
          ))}
        <MessageBubbleComponent
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          position={position}
        />
      </MessageRow>
    </MessageItem>
  );
}
