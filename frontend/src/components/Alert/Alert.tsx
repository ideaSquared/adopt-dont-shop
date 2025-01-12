import React from 'react'
import styled from 'styled-components'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

type AlertProps = {
  /** The message to display */
  children: React.ReactNode
  /** The variant style of the alert */
  variant?: AlertVariant
  /** Additional CSS class names */
  className?: string
}

const StyledAlert = styled.div<{ $variant: AlertVariant }>`
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return theme.text.success
      case 'error':
        return theme.text.danger
      case 'warning':
        return theme.text.warning
      case 'info':
        return theme.text.info
      default:
        return theme.text.success
    }
  }};
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  background-color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return theme.background.success
      case 'error':
        return theme.background.danger
      case 'warning':
        return theme.background.warning
      case 'info':
        return theme.background.info
      default:
        return theme.background.success
    }
  }};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border: 1px solid
    ${({ theme, $variant }) => {
      switch ($variant) {
        case 'success':
          return theme.border.success
        case 'error':
          return theme.border.danger
        case 'warning':
          return theme.border.warning
        case 'info':
          return theme.border.info
        default:
          return theme.border.success
      }
    }};
`

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'success',
  className,
}) => {
  return (
    <StyledAlert
      $variant={variant}
      className={className}
      role="alert"
      aria-live="polite"
    >
      {children}
    </StyledAlert>
  )
}
