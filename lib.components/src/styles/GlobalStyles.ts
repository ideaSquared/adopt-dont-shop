import { createGlobalStyle } from 'styled-components';
import { Theme } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}

export const GlobalStyles = createGlobalStyle`
  /* Modern font loading for Inter and Playfair Display */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap');
  
  /* Modern CSS reset and base styles */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }

  body {
    background-color: ${({ theme }) => theme.background.primary};
    color: ${({ theme }) => theme.text.primary};
    font-family: ${({ theme }) => theme.typography.family.sans};
    font-size: ${({ theme }) => theme.typography.size.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
    font-weight: ${({ theme }) => theme.typography.weight.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    -webkit-tap-highlight-color: transparent;
  }

  /* Modern typography hierarchy */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.typography.family.display};
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    color: ${({ theme }) => theme.text.primary};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.tight};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.size['4xl']};
    font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  }

  h2 {
    font-size: ${({ theme }) => theme.typography.size['3xl']};
    font-weight: ${({ theme }) => theme.typography.weight.bold};
  }

  h3 {
    font-size: ${({ theme }) => theme.typography.size['2xl']};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
  }

  h4 {
    font-size: ${({ theme }) => theme.typography.size.xl};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
  }

  h5 {
    font-size: ${({ theme }) => theme.typography.size.lg};
    font-weight: ${({ theme }) => theme.typography.weight.medium};
  }

  h6 {
    font-size: ${({ theme }) => theme.typography.size.base};
    font-weight: ${({ theme }) => theme.typography.weight.medium};
  }

  p {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
    color: ${({ theme }) => theme.text.secondary};
  }

  /* Modern link styling */
  a {
    color: ${({ theme }) => theme.text.link};
    text-decoration: none;
    transition: all ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.animations.easing.smooth};
    position: relative;

    &:hover {
      color: ${({ theme }) => theme.text.linkHover};
      transform: translateY(-1px);
    }

    &:focus {
      outline: none;
      box-shadow: ${({ theme }) => theme.shadows.focus};
      border-radius: ${({ theme }) => theme.border.radius.sm};
    }
  }

  /* Modern form element styling */
  button, input, textarea, select {
    font-family: ${({ theme }) => theme.typography.family.sans};
    font-size: ${({ theme }) => theme.typography.size.base};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  }

  /* Modern image handling */
  img {
    max-width: 100%;
    height: auto;
    display: block;
    border-radius: ${({ theme }) => theme.border.radius.md};
  }

  /* Modern selection styling */
  ::selection {
    background-color: ${({ theme }) => theme.colors.primary[200]};
    color: ${({ theme }) => theme.colors.primary[900]};
  }

  ::-moz-selection {
    background-color: ${({ theme }) => theme.colors.primary[200]};
    color: ${({ theme }) => theme.colors.primary[900]};
  }

  /* Modern scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.background.secondary};
    border-radius: ${({ theme }) => theme.border.radius.full};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral[400]};
    border-radius: ${({ theme }) => theme.border.radius.full};
    transition: background ${({ theme }) => theme.transitions.fast};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.neutral[500]};
  }

  /* Modern focus styles for accessibility */
  *:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.border.radius.sm};
  }

  /* Modern button focus styles */
  button:focus-visible {
    box-shadow: ${({ theme }) => theme.shadows.focusPrimary};
  }

  /* Modern list styling */
  ul, ol {
    margin-bottom: ${({ theme }) => theme.spacing.md};
    padding-left: ${({ theme }) => theme.spacing.lg};
  }

  li {
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  }

  /* Modern blockquote styling */
  blockquote {
    border-left: 4px solid ${({ theme }) => theme.colors.primary[500]};
    padding-left: ${({ theme }) => theme.spacing.md};
    margin: ${({ theme }) => theme.spacing.lg} 0;
    font-style: italic;
    color: ${({ theme }) => theme.text.secondary};
  }

  /* Modern code styling */
  code {
    font-family: ${({ theme }) => theme.typography.family.mono};
    background-color: ${({ theme }) => theme.background.secondary};
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    border-radius: ${({ theme }) => theme.border.radius.sm};
    font-size: 0.875em;
    color: ${({ theme }) => theme.text.primary};
  }

  pre {
    background-color: ${({ theme }) => theme.background.secondary};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.border.radius.md};
    overflow-x: auto;
    margin: ${({ theme }) => theme.spacing.lg} 0;
  }

  pre code {
    background: none;
    padding: 0;
  }

  /* Modern table styling */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: ${({ theme }) => theme.spacing.lg} 0;
  }

  th, td {
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${({ theme }) => theme.border.color.tertiary};
  }

  th {
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
    background-color: ${({ theme }) => theme.background.secondary};
  }

  /* Modern hr styling */
  hr {
    border: none;
    height: 1px;
    background-color: ${({ theme }) => theme.border.color.tertiary};
    margin: ${({ theme }) => theme.spacing.lg} 0;
  }
`;
