import type { Message } from '../types';
import { AvatarComponent } from './AvatarComponent';
import { MessageBubbleComponent, type MessageGroupPosition } from './MessageBubbleComponent';
import * as styles from './MessageItemComponent.css';

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

  const messageItemClass = isOwn
    ? styles.messageItemOwn[position]
    : styles.messageItemOther[position];
  const messageRowClass = isOwn ? styles.messageRowOwn : styles.messageRowOther;

  return (
    <div className={messageItemClass}>
      {showSenderName && message.senderName && (
        <div className={styles.senderName}>{message.senderName}</div>
      )}
      <div className={messageRowClass}>
        {!isOwn &&
          (showAvatar ? (
            <AvatarComponent initials={computeInitials(message.senderName, message.senderId)} />
          ) : (
            <div className={styles.avatarSpacer} aria-hidden />
          ))}
        <MessageBubbleComponent
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onToggleReaction={onToggleReaction}
          position={position}
        />
      </div>
    </div>
  );
}
