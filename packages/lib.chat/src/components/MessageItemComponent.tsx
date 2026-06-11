import type { Message } from '../types';
import { AvatarComponent } from './AvatarComponent';
import { MessageBubbleComponent, type MessageGroupPosition } from './MessageBubbleComponent';
import * as styles from './MessageItemComponent.css';

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  /**
   * The viewer's rescue affiliation. When set, the viewer is rescue
   * staff and other staff messages render with a "Staff" badge alongside
   * their real name. When undefined the viewer is treated as an adopter
   * and rescue-staff messages render under the rescue's name.
   */
  viewerRescueId?: string;
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

/**
 * Resolves the visible sender for a message based on who's looking:
 *   - Adopters see rescue-staff messages under the rescue's name. Hides
 *     internal handover from the public-facing conversation.
 *   - Rescue staff (any rescue) see the real sender name plus a "Staff"
 *     badge so handover is visible internally.
 *   - Falls back to the raw sender name if role/rescue metadata is
 *     missing — preserves prior behaviour for messages emitted by paths
 *     that don't yet populate the new fields.
 */
const resolveDisplay = (
  message: Message,
  viewerRescueId: string | undefined
): { name: string; showStaffBadge: boolean } => {
  const isStaffSender = message.senderRole === 'rescue_staff';
  const viewerIsStaff = !!viewerRescueId;

  if (isStaffSender && !viewerIsStaff && message.senderRescueName) {
    return { name: message.senderRescueName, showStaffBadge: false };
  }
  return { name: message.senderName, showStaffBadge: isStaffSender && viewerIsStaff };
};

export function MessageItemComponent({
  message,
  isOwn,
  currentUserId,
  viewerRescueId,
  onToggleReaction,
  position = 'single',
}: MessageItemProps) {
  const isHandover = isOwn && !!currentUserId && message.senderId !== currentUserId;
  const showAvatar = !isOwn && (position === 'first' || position === 'single');
  // Show sender name above the bubble when:
  //   - the message is from another participant (default), OR
  //   - the viewer is rescue staff and the bubble is on "their" side
  //     because a *different* staff member replied (handover): we still
  //     want to surface who actually typed it, even though it's rendered
  //     as part of the rescue's unified voice.
  const showSenderName = (!isOwn || isHandover) && (position === 'first' || position === 'single');

  const messageItemClass = isOwn
    ? styles.messageItemOwn[position]
    : styles.messageItemOther[position];
  const messageRowClass = isOwn ? styles.messageRowOwn : styles.messageRowOther;

  const { name: displayName, showStaffBadge } = resolveDisplay(message, viewerRescueId);

  return (
    <div className={messageItemClass}>
      {showSenderName && displayName && (
        <div className={isOwn ? styles.senderRowOwn : styles.senderRow}>
          <span className={styles.senderRowName}>{displayName}</span>
          {showStaffBadge && <span className={styles.staffBadge}>Staff</span>}
        </div>
      )}
      <div className={messageRowClass}>
        {!isOwn &&
          (showAvatar ? (
            <AvatarComponent initials={computeInitials(displayName, message.senderId)} />
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
