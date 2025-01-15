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
  color: ${(props) => props.theme.text.body};
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
  font-size: ${({ theme }) => theme.typography.size.base};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  padding: 0 ${({ theme }) => theme.spacing.sm};
  display: inline-flex;
  align-items: center;
  height: 100%;
  background-color: ${({ theme }) => theme.background.danger};
  color: ${({ theme }) => theme.text.light};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.text.danger};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
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
