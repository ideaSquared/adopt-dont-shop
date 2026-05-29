import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { darkTheme, lightTheme, normalTheme, Theme, ThemeMode } from './theme';
import { darkThemeClass, lightThemeClass, normalThemeClass } from './theme.css';
import './GlobalStyles.css';

type ThemeContextType = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: normalTheme,
  themeMode: 'normal',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
};

export const THEME_STORAGE_KEY = 'theme';

const readStoredThemeMode = (fallback: ThemeMode): ThemeMode => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'normal' || stored === 'dark') {
    return stored;
  }
  return fallback;
};

const themeFor = (mode: ThemeMode): Theme => {
  if (mode === 'dark') {
    return darkTheme;
  }
  if (mode === 'light') {
    return lightTheme;
  }
  return normalTheme;
};

const classFor = (mode: ThemeMode): string => {
  if (mode === 'dark') {
    return darkThemeClass;
  }
  if (mode === 'light') {
    return lightThemeClass;
  }
  return normalThemeClass;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'normal',
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode(initialTheme));
  const theme = themeFor(themeMode);
  const themeClass = classFor(themeMode);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  // Apply VE theme class to <html> so CSS variables are available document-wide,
  // including in portalled elements. Truthiness guards keep vitest's
  // vanilla-extract stub (which can return non-strings) from crashing classList.
  useEffect(() => {
    const root = document.documentElement;
    [lightThemeClass, normalThemeClass, darkThemeClass].forEach(cls => {
      if (typeof cls === 'string' && cls.length > 0) {
        root.classList.remove(cls);
      }
    });
    if (typeof themeClass === 'string' && themeClass.length > 0) {
      root.classList.add(themeClass);
    }
    root.setAttribute('data-theme', themeMode);
  }, [themeClass, themeMode]);

  const contextValue = useMemo(
    () => ({ theme, themeMode, setThemeMode }),
    [theme, themeMode, setThemeMode]
  );

  return <ThemeContext value={contextValue}>{children}</ThemeContext>;
};
