import { useMemo } from 'react';
import styled from 'styled-components';
import { useChat } from '../context/use-chat';
import type { Message } from '../types';
import { MessageItemComponent } from './MessageItemComponent';

type MessageListProps = {
  messages: Message[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
};

const MessageListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  width: 100%;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem 0.75rem 0.5rem 0.75rem;
  background: ${(props) => props.theme.background.primary};
  scrollbar-width: thin;
  scrollbar-color: ${(props) => props.theme.colors.neutral[300]}
    ${(props) => props.theme.background.primary};

  &::-webkit-scrollbar {
    width: 6px;
    background: ${(props) => props.theme.background.primary};
  }
  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.colors.neutral[300]};
    border-radius: 6px;
    transition: background 0.15s ease;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${(props) => props.theme.colors.neutral[400]};
  }
`;

const EmptyMessages = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  color: ${(props) => props.theme.text.secondary};
  padding: 3rem 1rem;

  .illustration {
    font-size: 3rem;
    opacity: 0.75;
    line-height: 1;
  }

  h4 {
    margin: 0;
    color: ${(props) => props.theme.text.primary};
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const DaySeparator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0 0.5rem 0;
  color: ${(props) => props.theme.text.tertiary};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${(props) => props.theme.border.color.tertiary};
  }
`;

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
      <EmptyMessages>
        <div className="illustration" aria-hidden>
          {'\u{1F43E}'}
        </div>
        <h4>No messages yet</h4>
        <p>Say hello to start the conversation.</p>
      </EmptyMessages>
    );
  }

  return (
    <MessageListWrapper>
      {items.map((item) => (
        <div key={item.message.id}>
          {item.showDaySeparator && (
            <DaySeparator role="separator" aria-label={item.dayLabel}>
              {item.dayLabel}
            </DaySeparator>
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
    </MessageListWrapper>
  );
}
