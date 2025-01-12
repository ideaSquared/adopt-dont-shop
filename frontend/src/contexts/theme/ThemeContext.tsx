import React, { createContext, useContext, useEffect, useState } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'
import { Theme, ThemeMode, darkTheme, lightTheme } from '../../styles/theme'

type ThemeContextType = {
  themeMode: ThemeMode
  toggleTheme: () => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

type ThemeProviderProps = {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as ThemeMode
    if (savedTheme) {
      return savedTheme
    }
    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark'
    }
    return 'light'
  })

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', themeMode)
    // Update meta theme-color
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeMode === 'dark' ? '#212121' : '#FFFFFF')
  }, [themeMode])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setThemeMode(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const theme: Theme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, theme }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  )
}
