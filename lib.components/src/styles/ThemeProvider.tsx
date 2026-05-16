import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { darkTheme, highContrastTheme, lightTheme, Theme, ThemeMode } from './theme';
import { darkThemeClass, highContrastThemeClass, lightThemeClass } from './theme.css';
import './GlobalStyles.css';

type ThemeContextType = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // ADS-137: high-contrast is an orthogonal accessibility preference. When
  // true, it overrides themeMode so the WCAG-AA palette is applied regardless
  // of the user's underlying light/dark preference.
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  toggleHighContrast: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'light',
  setThemeMode: () => {},
  highContrast: false,
  setHighContrast: () => {},
  toggleHighContrast: () => {},
});

export const useTheme = () => useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  initialHighContrast?: boolean;
};

export const HIGH_CONTRAST_STORAGE_KEY = 'theme-high-contrast';
export const THEME_STORAGE_KEY = 'theme';

const readStoredThemeMode = (fallback: ThemeMode): ThemeMode => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'high-contrast') {
    return stored;
  }
  return fallback;
};

const readStoredHighContrast = (fallback: boolean): boolean => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const stored = window.localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
  if (stored === 'true') {
    return true;
  }
  if (stored === 'false') {
    return false;
  }
  return fallback;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'light',
  initialHighContrast = false,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode(initialTheme));
  const [highContrast, setHighContrast] = useState<boolean>(() =>
    readStoredHighContrast(initialHighContrast)
  );

  const activeMode: ThemeMode = highContrast ? 'high-contrast' : themeMode;
  const theme =
    activeMode === 'high-contrast'
      ? highContrastTheme
      : activeMode === 'dark'
        ? darkTheme
        : lightTheme;
  const themeClass =
    activeMode === 'high-contrast'
      ? highContrastThemeClass
      : activeMode === 'dark'
        ? darkThemeClass
        : lightThemeClass;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(highContrast));
    }
  }, [highContrast]);

  // Apply VE theme class to <html> so CSS variables are available document-wide,
  // including in global styles and portalled elements. The truthiness guards
  // also keep vitest's vanilla-extract stub (which returns non-string values)
  // from blowing up classList with empty tokens.
  useEffect(() => {
    const root = document.documentElement;
    [lightThemeClass, darkThemeClass, highContrastThemeClass].forEach(cls => {
      if (typeof cls === 'string' && cls.length > 0) {
        root.classList.remove(cls);
      }
    });
    if (typeof themeClass === 'string' && themeClass.length > 0) {
      root.classList.add(themeClass);
    }
    // Surface the mode as a data attribute so app/global CSS can opt-in to
    // per-mode adjustments and assistive tech can inspect the current state.
    root.setAttribute('data-theme', activeMode);
    root.setAttribute('data-high-contrast', String(highContrast));
  }, [themeClass, activeMode, highContrast]);

  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => !prev);
  }, []);

  // ADS-137: Alt+Shift+H toggles high-contrast mode globally. Chosen to avoid
  // common browser/OS shortcuts and to mirror the convention used by other
  // accessibility-first products. Documented in docs/accessibility.md.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && (event.key === 'H' || event.key === 'h')) {
        event.preventDefault();
        toggleHighContrast();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleHighContrast]);

  return (
    <ThemeContext
      value={{
        theme,
        themeMode,
        setThemeMode,
        highContrast,
        setHighContrast,
        toggleHighContrast,
      }}
    >
      {children}
    </ThemeContext>
  );
};
