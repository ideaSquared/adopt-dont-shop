import React, { useState } from 'react'
import styled from 'styled-components'
import { EmojiPicker } from './EmojiPicker'

const ReactionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.xs};
  margin-top: ${(props) => props.theme.spacing.xs};
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

const AddReactionButton = styled(ReactionButton)`
  padding: ${(props) => props.theme.spacing.xs};
  color: ${(props) => props.theme.text.dim};
`

const EmojiPickerContainer = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 1000;
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
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
        >
          <path
            d="M8 3v10M3 8h10"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
