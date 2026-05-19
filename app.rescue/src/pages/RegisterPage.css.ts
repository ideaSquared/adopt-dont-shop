import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const helperText = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  lineHeight: 1.4,
});

globalStyle(`${helperText} strong`, {
  color: vars.text.secondary,
});
