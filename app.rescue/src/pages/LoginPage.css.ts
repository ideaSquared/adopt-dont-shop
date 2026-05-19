import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const helperText = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  lineHeight: 1.4,
  marginTop: '0.5rem',
});

globalStyle(`${helperText} strong`, {
  color: vars.text.secondary,
});

export const manageCookies = style({
  textAlign: 'center',
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
});
