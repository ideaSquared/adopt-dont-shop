import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  body {
    background-color: ${(props) => props.theme.background.body};
    color: ${(props) => props.theme.text.body};
    font-family: ${(props) => props.theme.font.family.body};
    font-size: ${(props) => props.theme.font.size.body};
  }
`;

export default GlobalStyles;
