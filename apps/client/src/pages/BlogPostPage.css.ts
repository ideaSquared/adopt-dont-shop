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

export const featuredImage = style({
  width: '100%',
  maxHeight: '400px',
  objectFit: 'cover',
  borderRadius: vars.border.radius.lg,
  marginBottom: vars.spacing['5'],
});

export const postContent = style({
  color: vars.text.primary,
  lineHeight: '1.8',
  fontSize: '1.05rem',
});

globalStyle(
  `${postContent} h1, ${postContent} h2, ${postContent} h3, ${postContent} h4, ${postContent} h5, ${postContent} h6`,
  {
    color: vars.text.primary,
    margin: `${vars.spacing['5']} 0 ${vars.spacing['3']}`,
  }
);

globalStyle(`${postContent} p`, {
  margin: '0 0 1.2rem',
});

globalStyle(`${postContent} a`, {
  color: vars.colors.infoHover,
});

globalStyle(`${postContent} a:hover`, {
  textDecoration: 'underline',
});

globalStyle(`${postContent} img`, {
  maxWidth: '100%',
  borderRadius: vars.border.radius.base,
  margin: `${vars.spacing['3']} 0`,
});

globalStyle(`${postContent} ul, ${postContent} ol`, {
  paddingLeft: vars.spacing['4'],
  marginBottom: '1.2rem',
});

globalStyle(`${postContent} blockquote`, {
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
