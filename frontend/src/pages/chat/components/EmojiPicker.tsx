import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  background: ${(props) => props.theme.background.content};
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: ${(props) => props.theme.border.radius.md};
  padding: ${(props) => props.theme.spacing.sm};
  box-shadow: ${(props) => props.theme.shadows.lg};
  max-width: 280px;
`

const CategoryTitle = styled.div`
  font-size: ${(props) => props.theme.typography.size.xs};
  color: ${(props) => props.theme.text.dim};
  margin-bottom: ${(props) => props.theme.spacing.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${(props) => props.theme.spacing.xs};
  margin-bottom: ${(props) => props.theme.spacing.sm};
`

const EmojiButton = styled.button`
  padding: ${(props) => props.theme.spacing.xs};
  border: none;
  background: none;
  border-radius: ${(props) => props.theme.border.radius.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: ${(props) => props.theme.typography.size.lg};

  &:hover {
    background: ${(props) => props.theme.background.mouseHighlight};
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

// Emoji categories for better organization
const EMOJI_CATEGORIES = [
  {
    name: 'Common',
    emojis: ['👍', '👎', '❤️', '😀', '😂', '👏', '🔥'],
  },
  {
    name: 'Faces',
    emojis: ['😊', '😍', '🤔', '😮', '😢', '😎', '🥳'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🙌', '👀', '💪', '🙏', '🤝', '✌️'],
  },
  {
    name: 'Symbols',
    emojis: ['💯', '✨', '💡', '⭐', '🎯', '🚀', '🎉'],
  },
]

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  return (
    <Container role="dialog" aria-label="Emoji picker">
      {EMOJI_CATEGORIES.map((category) => (
        <div key={category.name}>
          <CategoryTitle>{category.name}</CategoryTitle>
          <Grid>
            {category.emojis.map((emoji) => (
              <EmojiButton
                key={emoji}
                onClick={() => onSelect(emoji)}
                aria-label={`Select ${emoji} emoji`}
              >
                <span role="img" aria-hidden="true">
                  {emoji}
                </span>
              </EmojiButton>
            ))}
          </Grid>
        </div>
      ))}
    </Container>
  )
}
