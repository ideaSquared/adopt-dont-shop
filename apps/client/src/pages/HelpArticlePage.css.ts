import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: `${vars.spacing['6']} 0`,
  maxWidth: '800px',
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  color: vars.text.tertiary,
  textDecoration: 'none',
  fontSize: '0.9rem',
  marginBottom: vars.spacing['5'],
  ':hover': {
    color: vars.text.primary,
  },
});

export const articleContent = style({
  color: vars.text.primary,
  lineHeight: '1.8',
  fontSize: '1.05rem',
});

globalStyle(
  `${articleContent} h1, ${articleContent} h2, ${articleContent} h3, ${articleContent} h4, ${articleContent} h5, ${articleContent} h6`,
  {
    color: vars.text.primary,
    margin: `${vars.spacing['5']} 0 ${vars.spacing['3']}`,
  }
);

globalStyle(`${articleContent} p`, {
  margin: '0 0 1.2rem',
});

globalStyle(`${articleContent} a`, {
  color: vars.colors.infoHover,
});

globalStyle(`${articleContent} a:hover`, {
  textDecoration: 'underline',
});

globalStyle(`${articleContent} img`, {
  maxWidth: '100%',
  borderRadius: vars.border.radius.base,
  margin: `${vars.spacing['3']} 0`,
});

globalStyle(`${articleContent} ul, ${articleContent} ol`, {
  paddingLeft: vars.spacing['4'],
  marginBottom: '1.2rem',
});

globalStyle(`${articleContent} blockquote`, {
  borderLeft: `4px solid ${vars.colors.infoHover}`,
  margin: `${vars.spacing['4']} 0`,
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  color: vars.text.tertiary,
  fontStyle: 'italic',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: vars.spacing['7'],
});
