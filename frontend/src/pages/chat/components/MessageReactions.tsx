import React, { useState } from 'react'
import styled from 'styled-components'
import { EmojiPicker } from './EmojiPicker'

const ReactionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
`

const ReactionButton = styled.button<{ isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: ${(props) => props.theme.border.radius.full};
  background: ${(props) =>
    props.isActive
      ? props.theme.background.highlight
      : props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  font-size: ${(props) => props.theme.typography.size.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.background.mouseHighlight};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const AddReactionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${(props) => props.theme.border.color.default};
  background: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.dim};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.background.mouseHighlight};
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  z-index: 1000;
  margin-bottom: ${(props) => props.theme.spacing.xs};
  box-shadow: ${(props) => props.theme.shadows.md};
`

interface Reaction {
  emoji: string
  count: number
  users: string[] // Array of user IDs who reacted
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reaction[]
  currentUserId: string
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleReactionClick = (emoji: string) => {
    const reaction = reactions.find((r) => r.emoji === emoji)
    if (reaction?.users.includes(currentUserId)) {
      onRemoveReaction(messageId, emoji)
    } else {
      onAddReaction(messageId, emoji)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(messageId, emoji)
    setShowEmojiPicker(false)
  }

  return (
    <ReactionsContainer>
      {reactions.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          isActive={reaction.users.includes(currentUserId)}
          aria-label={`${reaction.emoji} reaction (${reaction.count} ${
            reaction.count === 1 ? 'user' : 'users'
          })`}
        >
          <span role="img" aria-hidden="true">
            {reaction.emoji}
          </span>
          <span>{reaction.count}</span>
        </ReactionButton>
      ))}
      <AddReactionButton
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        aria-label="Add reaction"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.828 14.828a4 4 0 10-5.656-5.656 4 4 0 005.656 5.656z" />
          <path d="M17.657 6.343A8 8 0 014.343 19.657 8 8 0 0117.657 6.343z" />
          <path d="M9 12h.01" />
          <path d="M15 12h.01" />
          <path d="M10 16c.5.3 1.6.5 2 .5s1.5-.2 2-.5" />
        </svg>
      </AddReactionButton>
      {showEmojiPicker && (
        <EmojiPickerContainer>
          <EmojiPicker onSelect={handleEmojiSelect} />
        </EmojiPickerContainer>
      )}
    </ReactionsContainer>
  )
}
