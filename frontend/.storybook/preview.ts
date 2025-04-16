import type { Preview } from '@storybook/react'
import { themes } from '@storybook/theming'

import { withThemeFromJSXProvider } from '@storybook/addon-themes'
import { ThemeProvider } from 'styled-components'

/* Update import paths for theme and global styles */
import GlobalStyles from '../src/styles/GlobalStyles'
import { darkTheme, lightTheme } from '../src/styles/theme'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: themes.dark,
    },
  },

  decorators: [
    withThemeFromJSXProvider({
      themes: {
        light: lightTheme,
        dark: darkTheme,
      },
      defaultTheme: 'light',
      Provider: ThemeProvider,
      GlobalStyles, // Use imported GlobalStyles
    }),
  ],
}

export default preview
