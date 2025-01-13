import React from 'react'
import styled from 'styled-components'
import { useTheme } from '../../contexts/theme/ThemeContext'

const ToggleButton = styled.button`
  background: none;
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.default};
  border-radius: ${({ theme }) => theme.border.radius.full};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.text.body};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.background.contrast};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`

const Icon = styled.span`
  font-size: ${({ theme }) => theme.typography.size.lg};
`

export const ThemeToggle: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme()

  return (
    <ToggleButton
      onClick={toggleTheme}
      aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
    >
      <Icon>{themeMode === 'light' ? '🌙' : '☀️'}</Icon>
      {themeMode === 'light' ? 'Dark' : 'Light'} Mode
    </ToggleButton>
  )
}
