import React from 'react'
import styled from 'styled-components'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'content' | 'success' | 'danger' | 'warning' | 'info' | null
  onClick?: () => void // Optional onClick handler for the badge itself
  onActionClick?: () => void // Optional onClick handler for the action button
  showAction?: boolean | null // Controls visibility of the action button
}

const BadgeContainer = styled.div<{ variant: BadgeProps['variant'] }>`
  display: inline-flex;
  align-items: center;
  border-radius: 0.25rem;
  overflow: hidden;
  background-color: ${(props) => {
    switch (props.variant) {
      case 'success':
        return props.theme.background.success
      case 'danger':
        return props.theme.background.danger
      case 'warning':
        return props.theme.background.warning
      case 'info':
        return props.theme.background.info
      default:
        return props.theme.background.contrast
    }
  }};
  color: ${(props) => {
    switch (props.variant) {
      case 'success':
        return props.theme.text.success
      case 'danger':
        return props.theme.text.danger
      case 'warning':
        return props.theme.text.warning
      case 'info':
        return props.theme.text.info
      default:
        return props.theme.text.body
    }
  }};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${(props) => (props.onClick ? 'pointer' : 'default')};
`

const StyledBadge = styled.span`
  padding: 0.25rem 0.5rem;
  display: inline-flex;
  align-items: center;
`

const ActionButton = styled.span`
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
  padding: 0 0.5rem;
  display: inline-flex;
  align-items: center;
  height: 100%;
  background-color: ${(props) => props.theme.background.danger};
  color: red;
  &:hover {
    color: darkred;
  }
`

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'content',
  onClick,
  onActionClick,
  showAction = false, // Default to false if not provided
}) => {
  return (
    <BadgeContainer variant={variant} onClick={onClick}>
      <StyledBadge>{children}</StyledBadge>
      {showAction && onActionClick && (
        <ActionButton
          onClick={(e) => {
            e.stopPropagation()
            onActionClick()
          }}
        >
          &times;
        </ActionButton>
      )}
    </BadgeContainer>
  )
}

export default Badge
