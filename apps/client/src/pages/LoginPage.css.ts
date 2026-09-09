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
  // ADS-1326: colors.primary (#F43F5E) measures ~3.67:1 on white and
  // ~3.44:1 on the `normal` theme's warm-cream body — under the 4.5:1 AA
  // floor, and what axe-core's smoke gate caught on /login. primaryActive
  // clears 4.5:1 on both (~6.29:1 / ~5.88:1).
  color: vars.colors.primaryActive,
  textDecoration: 'none',
  fontWeight: '500',
});

globalStyle(`${signupPrompt} a:hover`, {
  textDecoration: 'underline',
});
