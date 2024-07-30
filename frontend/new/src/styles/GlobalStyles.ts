import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  body {
    background-color: ${(props) => props.theme.background.body};
    color: ${(props) => props.theme.text.body};
    font-family: 'Arial, sans-serif';
  }
`;

export default GlobalStyles;
