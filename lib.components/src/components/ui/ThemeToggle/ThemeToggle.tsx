import React from 'react';

import { useTheme } from '../../../styles/ThemeProvider';
import * as styles from './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleTheme}
      aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className={styles.icon}>{themeMode === 'light' ? '🌙' : '☀️'}</span>
      {themeMode === 'light' ? 'Dark' : 'Light'} Mode
    </button>
  );
};
