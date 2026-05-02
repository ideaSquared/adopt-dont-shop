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

const computeRenderInfo = (
  messages: Message[],
  currentUserId: string | undefined
): MessageRenderInfo[] => {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const msgDate = new Date(message.timestamp);
    const prevDate = prev ? new Date(prev.timestamp) : null;

    const showDaySeparator = !prev || !prevDate || !sameDay(prevDate, msgDate);

    const inGroupWithPrev =
      !showDaySeparator &&
      prev !== undefined &&
      prev.senderId === message.senderId &&
      prevDate !== null &&
      msgDate.getTime() - prevDate.getTime() < GROUP_WINDOW_MS;

    const nextDate = next ? new Date(next.timestamp) : null;
    const inGroupWithNext =
      next !== undefined &&
      next.senderId === message.senderId &&
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
      isOwn: message.senderId === currentUserId,
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
    () => computeRenderInfo(safeMessages, currentUser?.userId),
    [safeMessages, currentUser?.userId]
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
            onToggleReaction={onToggleReaction}
            position={item.position}
          />
        </div>
      ))}
    </div>
  );
}
