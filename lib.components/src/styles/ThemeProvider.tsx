import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

import { darkTheme, lightTheme, Theme, ThemeMode } from './theme';
import { darkThemeClass, lightThemeClass } from './theme.css';
import './GlobalStyles.css';

// Keep DefaultTheme augmented while consuming apps still use styled-components.
// Remove once all app.* styled-components are migrated to Vanilla Extract.
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}

type ThemeContextType = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'light',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'light',
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as ThemeMode) || initialTheme;
    }
    return initialTheme;
  });

  const theme = themeMode === 'light' ? lightTheme : darkTheme;
  const themeClass = themeMode === 'light' ? lightThemeClass : darkThemeClass;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', themeMode);
    }
  }, [themeMode]);

  // Apply VE theme class to <html> so CSS variables are available document-wide,
  // including in global styles and portalled elements.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(lightThemeClass, darkThemeClass);
    root.classList.add(themeClass);
  }, [themeClass]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
