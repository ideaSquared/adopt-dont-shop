import { createGlobalStyle } from 'styled-components';
import { font } from './colors';

const GlobalStyles = createGlobalStyle`
  body {
    background-color: ${(props) => props.theme.background.body};
    color: ${(props) => props.theme.text.body};
    font-family: ${font.family.body};
    font-size: ${font.size.body};
  }

  a {
  color: ${(props) => props.theme.text.link};
  }
`;

export default GlobalStyles;
