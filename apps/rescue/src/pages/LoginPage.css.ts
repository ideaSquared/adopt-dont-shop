import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const helperText = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  lineHeight: 1.4,
  marginTop: vars.spacing['2'],
});

globalStyle(`${helperText} strong`, {
  color: vars.text.secondary,
});

export const manageCookies = style({
  textAlign: 'center',
  marginTop: vars.spacing['3'],
  paddingTop: vars.spacing['3'],
  borderTop: `1px solid ${vars.border.color.default}`,
});
