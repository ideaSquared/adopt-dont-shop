import { type MessageReaction } from '@adopt-dont-shop/lib.chat';
import styled from 'styled-components';

const ReactionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const ReactionBadge = styled.button<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 12px;
  border: 1px solid
    ${props =>
      props.$isActive ? props.theme.colors.primary[300] : props.theme.border.color.secondary};
  background: ${props =>
    props.$isActive ? props.theme.colors.primary[50] : props.theme.background.primary};
  cursor: pointer;
  font-size: 0.8125rem;
  line-height: 1.4;
  transition: all 0.15s ease;

  &:hover {
    background: ${props =>
      props.$isActive ? props.theme.colors.primary[100] : props.theme.background.secondary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ReactionEmoji = styled.span`
  font-size: 0.875rem;
  line-height: 1;
`;

const ReactionCount = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${props => props.theme.text.secondary};
`;

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
    <ReactionsRow>
      {groups.map(group => (
        <ReactionBadge
          key={group.emoji}
          $isActive={group.isActive}
          onClick={() => onToggleReaction(group.emoji)}
          aria-label={`${group.emoji} reaction, ${group.count} ${group.count === 1 ? 'person' : 'people'}${group.isActive ? ', you reacted' : ''}`}
          title={`${group.emoji} ${group.count}`}
        >
          <ReactionEmoji>{group.emoji}</ReactionEmoji>
          <ReactionCount>{group.count}</ReactionCount>
        </ReactionBadge>
      ))}
    </ReactionsRow>
  );
}
