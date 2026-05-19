import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const registerPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
});

globalStyle(`${registerPrompt} p`, {
  color: vars.text.tertiary,
  marginBottom: '0.5rem',
});

globalStyle(`${registerPrompt} a`, {
  color: vars.colors.primary['500'],
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${registerPrompt} a:hover`, {
  textDecoration: 'underline',
});

export const manageCookies = style({
  textAlign: 'center',
  marginTop: '1rem',
});

export const helperText = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  lineHeight: 1.4,
  marginTop: '0.5rem',
});

globalStyle(`${helperText} strong`, {
  color: vars.text.secondary,
});
