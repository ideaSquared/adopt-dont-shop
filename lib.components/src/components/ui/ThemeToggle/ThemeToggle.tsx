import React from 'react';

import { useTheme } from '../../../styles/ThemeProvider';
import type { ThemeMode } from '../../../styles/theme';
import * as styles from './ThemeToggle.css';

const order: ThemeMode[] = ['light', 'normal', 'dark'];

const labelFor: Record<ThemeMode, string> = {
  light: 'Light',
  normal: 'Cosy',
  dark: 'Dark',
};

const iconFor: Record<ThemeMode, string> = {
  light: '☀',
  normal: '☕',
  dark: '🌙',
};

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  const next = order[(order.indexOf(themeMode) + 1) % order.length];

  return (
    <button
      className={styles.toggleButton}
      onClick={() => setThemeMode(next)}
      aria-label={`Switch to ${labelFor[next]} theme`}
    >
      <span className={styles.icon}>{iconFor[themeMode]}</span>
      {labelFor[themeMode]}
    </button>
  );
};
