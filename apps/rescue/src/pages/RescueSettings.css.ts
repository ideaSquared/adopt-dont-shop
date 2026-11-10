import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: vars.spacing['5'],
  maxWidth: '1200px',
  margin: '0 auto',
});

export const placeholderSection = style({
  background: vars.background.body,
  border: `2px dashed ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['6'],
  textAlign: 'center',
});

globalStyle(`${placeholderSection} h2`, {
  fontSize: vars.typography.size['2xl'],
  color: vars.text.secondary,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

globalStyle(`${placeholderSection} p`, {
  fontSize: vars.typography.size.base,
  color: vars.text.tertiary,
  margin: 0,
});
