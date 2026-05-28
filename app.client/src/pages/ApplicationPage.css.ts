import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const header = style({
  textAlign: 'center',
  marginBottom: '2rem',
});

globalStyle(`${header} h1`, {
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

globalStyle(`${header} p`, {
  color: vars.text.tertiary,
  fontSize: '1.1rem',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const backToSearchButton = style({
  marginTop: '1rem',
});

export const sectionAlert = style({
  marginBottom: '2rem',
});
