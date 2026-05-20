import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const signupPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${signupPrompt} p`, {
  color: vars.text.tertiary,
  marginBottom: '0.5rem',
});

globalStyle(`${signupPrompt} a`, {
  color: vars.colors.primary,
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${signupPrompt} a:hover`, {
  textDecoration: 'underline',
});
