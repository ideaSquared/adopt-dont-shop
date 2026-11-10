import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const loginPrompt = style({
  textAlign: 'center',
  marginTop: vars.spacing['4'],
  paddingTop: vars.spacing['4'],
  borderTop: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${loginPrompt} p`, {
  color: vars.text.tertiary,
  marginBottom: vars.spacing['2'],
});

globalStyle(`${loginPrompt} a`, {
  color: vars.colors.primary,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
});

globalStyle(`${loginPrompt} a:hover`, {
  textDecoration: 'underline',
});

export const helperText = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  lineHeight: 1.4,
});

globalStyle(`${helperText} strong`, {
  color: vars.text.secondary,
});
