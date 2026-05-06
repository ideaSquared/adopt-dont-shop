import { useMemo } from 'react';
import { useChat } from '../context/use-chat';
import type { Message } from '../types';
import * as styles from './MessageList.css';
import { MessageItemComponent } from './MessageItemComponent';

type MessageListProps = {
  messages: Message[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
};

/** Consecutive messages from the same sender within this window get grouped. */
const GROUP_WINDOW_MS = 2 * 60 * 1000;

type GroupPosition = 'single' | 'first' | 'middle' | 'last';

type MessageRenderInfo = {
  message: Message;
  isOwn: boolean;
  position: GroupPosition;
  showDaySeparator: boolean;
  dayLabel: string;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDayLabel = (date: Date): string => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sameDay(date, now)) {
    return 'Today';
  }
  if (sameDay(date, yesterday)) {
    return 'Yesterday';
  }
  const thisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: thisYear ? undefined : 'numeric',
  });
};

/**
 * "Own" — i.e. right-aligned, "us" side of the conversation:
 *   - Adopter viewers: messages they personally sent.
 *   - Rescue staff viewers: any rescue-staff message (the rescue is the
 *     unified actor in the conversation, regardless of which staff
 *     member happens to be replying). Each individual sender is still
 *     identified above the bubble via name + Staff badge so internal
 *     handover stays visible.
 */
const isMessageOwn = (
  message: Message,
  currentUserId: string | undefined,
  viewerRescueId: string | undefined
): boolean => {
  if (message.senderId === currentUserId) {
    return true;
  }
  if (viewerRescueId && message.senderRole === 'rescue_staff') {
    return true;
  }
  return false;
};

const computeRenderInfo = (
  messages: Message[],
  currentUserId: string | undefined,
  viewerRescueId: string | undefined
): MessageRenderInfo[] => {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const msgDate = new Date(message.timestamp);
    const prevDate = prev ? new Date(prev.timestamp) : null;

    const showDaySeparator = !prev || !prevDate || !sameDay(prevDate, msgDate);

    // Grouping requires same sender AND same own-side. Same-senderId
    // alone isn't enough because the rescue-staff "we are the rescue"
    // view aligns multiple senders to the same side, but each staff
    // member still needs their own name + Staff badge above their
    // bubble so internal handover stays visible.
    const ownThis = isMessageOwn(message, currentUserId, viewerRescueId);
    const ownPrev = prev ? isMessageOwn(prev, currentUserId, viewerRescueId) : null;
    const ownNext = next ? isMessageOwn(next, currentUserId, viewerRescueId) : null;

    const inGroupWithPrev =
      !showDaySeparator &&
      prev !== undefined &&
      prev.senderId === message.senderId &&
      ownPrev === ownThis &&
      prevDate !== null &&
      msgDate.getTime() - prevDate.getTime() < GROUP_WINDOW_MS;

    const nextDate = next ? new Date(next.timestamp) : null;
    const inGroupWithNext =
      next !== undefined &&
      next.senderId === message.senderId &&
      ownNext === ownThis &&
      nextDate !== null &&
      sameDay(nextDate, msgDate) &&
      nextDate.getTime() - msgDate.getTime() < GROUP_WINDOW_MS;

    let position: GroupPosition;
    if (inGroupWithPrev && inGroupWithNext) {
      position = 'middle';
    } else if (inGroupWithPrev) {
      position = 'last';
    } else if (inGroupWithNext) {
      position = 'first';
    } else {
      position = 'single';
    }

    return {
      message,
      isOwn: ownThis,
      position,
      showDaySeparator,
      dayLabel: formatDayLabel(msgDate),
    };
  });
};

export function MessageList({ messages, onToggleReaction }: MessageListProps) {
  const { currentUser } = useChat();

  const safeMessages = Array.isArray(messages) ? messages : [];

  const items = useMemo(
    () => computeRenderInfo(safeMessages, currentUser?.userId, currentUser?.rescueId),
    [safeMessages, currentUser?.userId, currentUser?.rescueId]
  );

  if (safeMessages.length === 0) {
    return (
      <div className={styles.emptyMessages}>
        <div className="illustration" aria-hidden>
          {'\u{1F43E}'}
        </div>
        <h4>No messages yet</h4>
        <p>Say hello to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className={styles.messageListWrapper}>
      {items.map((item) => (
        <div key={item.message.id}>
          {item.showDaySeparator && (
            <div className={styles.daySeparator} role="separator" aria-label={item.dayLabel}>
              {item.dayLabel}
            </div>
          )}
          <MessageItemComponent
            message={item.message}
            isOwn={item.isOwn}
            currentUserId={currentUser?.userId}
            viewerRescueId={currentUser?.rescueId}
            onToggleReaction={onToggleReaction}
            position={item.position}
          />
        </div>
      ))}
    </div>
  );
}
