import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
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
