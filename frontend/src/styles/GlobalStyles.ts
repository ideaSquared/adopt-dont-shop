import { createGlobalStyle } from 'styled-components'
import { Theme } from './theme'

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: ${({ theme }) => theme.background.body};
    color: ${({ theme }) => theme.text.body};
    font-family: ${({ theme }) => theme.typography.family.body};
    font-size: ${({ theme }) => theme.typography.size.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.base};
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.typography.family.heading};
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  a {
    color: ${({ theme }) => theme.text.link};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.text.highlight};
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  button, input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  /* Focus styles for better accessibility */
  :focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`

export default GlobalStyles
