import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    font-size: 16px;
  }

  body {
    background-color: ${({ theme }) => theme.background.body};
    color: ${({ theme }) => theme.text.body};
    font-family: ${({ theme }) => theme.typography.family.body};
    font-size: ${({ theme }) => theme.typography.size.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.base};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.typography.family.heading};
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.size['4xl']};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.size['3xl']};
  }

  h3 {
    font-size: ${({ theme }) => theme.typography.size['2xl']};
  }

  h4 {
    font-size: ${({ theme }) => theme.typography.size.xl};
  }

  h5 {
    font-size: ${({ theme }) => theme.typography.size.lg};
  }

  h6 {
    font-size: ${({ theme }) => theme.typography.size.base};
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
      text-decoration: underline;
    }
  }

  button, input, textarea, select {
    font-family: ${({ theme }) => theme.typography.family.body};
    font-size: ${({ theme }) => theme.typography.size.base};
  }

  img {
    max-width: 100%;
    height: auto;
  }

  ::selection {
    background-color: ${({ theme }) => theme.text.highlight};
    color: ${({ theme }) => theme.text.light};
  }
`;
