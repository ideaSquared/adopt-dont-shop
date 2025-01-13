import React from 'react'
import styled from 'styled-components'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'content' | 'success' | 'danger' | 'warning' | 'info'
}

const StyledButton = styled.button<ButtonProps>`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.default};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-size: ${({ theme }) => theme.typography.size.base};
  line-height: ${({ theme }) => theme.typography.lineHeight.base};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  position: relative;
  white-space: nowrap;

  ${(props) => {
    switch (props.variant) {
      case 'content':
        return `
          background-color: ${props.theme.background.content};
          color: ${props.theme.text.body};
          border-color: ${props.theme.border.color.default};
          
          &:hover {
            background-color: ${props.theme.background.contrast};
            border-color: ${props.theme.border.color.default};
          }
          
          &:active {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `
      case 'success':
        return `
          background-color: ${props.theme.background.success};
          color: ${props.theme.text.light};
          border-color: ${props.theme.background.success};
          
          &:hover {
            background-color: ${props.theme.text.success};
            border-color: ${props.theme.text.success};
          }
          
          &:active {
            background-color: ${props.theme.text.success};
            opacity: 0.9;
          }
        `
      case 'danger':
        return `
          background-color: ${props.theme.background.danger};
          color: ${props.theme.text.light};
          border-color: ${props.theme.background.danger};
          
          &:hover {
            background-color: ${props.theme.text.danger};
            border-color: ${props.theme.text.danger};
          }
          
          &:active {
            background-color: ${props.theme.text.danger};
            opacity: 0.9;
          }
        `
      case 'warning':
        return `
          background-color: ${props.theme.background.warning};
          color: ${props.theme.text.dark};
          border-color: ${props.theme.background.warning};
          
          &:hover {
            background-color: ${props.theme.text.warning};
            border-color: ${props.theme.text.warning};
          }
          
          &:active {
            background-color: ${props.theme.text.warning};
            opacity: 0.9;
          }
        `
      case 'info':
        return `
          background-color: ${props.theme.background.info};
          color: ${props.theme.text.light};
          border-color: ${props.theme.background.info};
          
          &:hover {
            background-color: ${props.theme.text.info};
            border-color: ${props.theme.text.info};
          }
          
          &:active {
            background-color: ${props.theme.text.info};
            opacity: 0.9;
          }
        `
      default:
        return `
          background-color: ${props.theme.background.content};
          color: ${props.theme.text.body};
          border-color: ${props.theme.border.color.default};
          
          &:hover {
            background-color: ${props.theme.background.contrast};
            border-color: ${props.theme.border.color.default};
          }
          
          &:active {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `
    }
  }}

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.background.disabled};
    color: ${({ theme }) => theme.text.dim};
    border-color: ${({ theme }) => theme.border.color.default};
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.7;
    pointer-events: none;
  }
`

const Button: React.FC<ButtonProps> = ({
  type = 'button',
  onClick,
  children,
  disabled = false,
  variant = 'content',
  ...props
}) => {
  return (
    <StyledButton
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      {...props}
    >
      {children}
    </StyledButton>
  )
}

export default Button
