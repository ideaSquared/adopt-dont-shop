import React from 'react';

import { useTheme } from '../../../styles/ThemeProvider';
import * as styles from './HighContrastToggle.css';

export type HighContrastToggleProps = {
  className?: string;
  // ADS-137: keyboard shortcut hint shown alongside the toggle. Defaulted so
  // the same string lives in one place and matches the handler in
  // ThemeProvider.tsx.
  shortcutHint?: string;
  showShortcutHint?: boolean;
};

export const HIGH_CONTRAST_SHORTCUT_HINT = 'Alt + Shift + H';

export const HighContrastToggle: React.FC<HighContrastToggleProps> = ({
  className,
  shortcutHint = HIGH_CONTRAST_SHORTCUT_HINT,
  showShortcutHint = true,
}) => {
  const { highContrast, toggleHighContrast } = useTheme();
  const label = highContrast ? 'Turn off high-contrast mode' : 'Turn on high-contrast mode';

  return (
    <button
      type='button'
      className={[styles.toggleButton, className].filter(Boolean).join(' ')}
      aria-pressed={highContrast}
      aria-label={label}
      title={showShortcutHint ? `${label} (${shortcutHint})` : label}
      onClick={toggleHighContrast}
    >
      <span className={styles.icon} aria-hidden='true'>
        {highContrast ? '◼' : '◻'}
      </span>
      <span>High contrast</span>
      <span className={styles.indicator}>{highContrast ? 'On' : 'Off'}</span>
    </button>
  );
};
