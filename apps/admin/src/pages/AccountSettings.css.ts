import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '800px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
  margin: 0,
});
