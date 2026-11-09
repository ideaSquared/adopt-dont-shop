import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const errorContainer = style({
  backgroundColor: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
  padding: '2rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
});

globalStyle(`${errorContainer} h3`, {
  fontSize: '1.25rem',
  margin: '0 0 1rem 0',
});

globalStyle(`${errorContainer} p`, {
  margin: 0,
});

export const placeholderSection = style({
  background: vars.background.body,
  border: `2px dashed ${vars.border.color.muted}`,
  borderRadius: '0.75rem',
  padding: '3rem',
  textAlign: 'center',
});

globalStyle(`${placeholderSection} h2`, {
  fontSize: '1.5rem',
  color: vars.text.secondary,
  margin: '0 0 1rem 0',
});

globalStyle(`${placeholderSection} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});
