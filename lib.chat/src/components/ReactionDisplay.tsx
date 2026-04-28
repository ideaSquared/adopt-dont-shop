import type { MessageReaction } from '../types';
import * as styles from './ReactionDisplay.css';

type ReactionGroup = {
  emoji: string;
  count: number;
  userIds: string[];
  isActive: boolean;
};

type ReactionDisplayProps = {
  reactions: MessageReaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
};

const groupReactions = (reactions: MessageReaction[], currentUserId: string): ReactionGroup[] => {
  const grouped = new Map<string, { count: number; userIds: string[] }>();

  for (const reaction of reactions) {
    const existing = grouped.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds = [...existing.userIds, reaction.userId];
    } else {
      grouped.set(reaction.emoji, { count: 1, userIds: [reaction.userId] });
    }
  }

  return Array.from(grouped.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userIds: data.userIds,
    isActive: data.userIds.includes(currentUserId),
  }));
};

export function ReactionDisplay({
  reactions,
  currentUserId,
  onToggleReaction,
}: ReactionDisplayProps) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  const groups = groupReactions(reactions, currentUserId);

  return (
    <div className={styles.reactionsRow}>
      {groups.map((group) => (
        <button
          key={group.emoji}
          className={styles.reactionBadge[group.isActive ? 'active' : 'inactive']}
          onClick={() => onToggleReaction(group.emoji)}
          aria-label={`${group.emoji} reaction, ${group.count} ${group.count === 1 ? 'person' : 'people'}${group.isActive ? ', you reacted' : ''}`}
          title={`${group.emoji} ${group.count}`}
        >
          <span className={styles.reactionEmoji}>{group.emoji}</span>
          <span className={styles.reactionCount}>{group.count}</span>
        </button>
      ))}
    </div>
  );
}
