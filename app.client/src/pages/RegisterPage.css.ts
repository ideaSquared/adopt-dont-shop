import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const loginPrompt = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.border.color.secondary}`,
});

globalStyle(`${loginPrompt} p`, {
  color: vars.text.tertiary,
  marginBottom: '0.5rem',
});

globalStyle(`${loginPrompt} a`, {
  color: vars.colors.primary['600'],
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${loginPrompt} a:hover`, {
  textDecoration: 'underline',
});
