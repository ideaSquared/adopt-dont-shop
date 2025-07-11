import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../../../styles/ThemeProvider';

const ToggleButton = styled.button`
  background: none;
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.full};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.text.primary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.background.overlay};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`;

const Icon = styled.span`
  font-size: ${({ theme }) => theme.typography.size.lg};
`;

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ToggleButton
      onClick={toggleTheme}
      aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
    >
      <Icon>{themeMode === 'light' ? '🌙' : '☀️'}</Icon>
      {themeMode === 'light' ? 'Dark' : 'Light'} Mode
    </ToggleButton>
  );
};
