import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, ThemeMode, Theme } from './theme';
import { GlobalStyles } from './GlobalStyles';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'light',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'light',
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Try to get the theme from localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as ThemeMode;
      return savedTheme || initialTheme;
    }
    return initialTheme;
  });

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  // Save the theme preference to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', themeMode);
    }
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <StyledThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
