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

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '0.75rem',
  padding: '2rem',
  marginBottom: '1.5rem',
});

globalStyle(`${section} h2`, {
  fontSize: '1.25rem',
  color: vars.text.secondary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${section} > p`, {
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  margin: '0 0 1.5rem 0',
});
