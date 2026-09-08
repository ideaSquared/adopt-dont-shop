import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const styledAlert = style({
  marginBottom: vars.spacing['3'],
});

export const helperText = style({
  color: vars.text.secondary,
  marginTop: vars.spacing['2'],
  display: 'block',
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.snug,
});

globalStyle(`${helperText} strong`, {
  color: vars.text.primary,
});

export const twoFactorGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: vars.spacing['3'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

export const twoFactorLabel = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const twoFactorDescription = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  margin: '0',
});

export const tokenInput = style({
  padding: vars.spacing['2'],
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.xl,
  letterSpacing: vars.typography.letterSpacing.widest,
  textAlign: 'center',
  maxWidth: '200px',
  background: vars.background.body,
  color: vars.text.primary,
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.colors.primary,
      boxShadow: `0 0 0 2px ${vars.colors.primaryBgSubtle}`,
    },
  },
});

export const backLink = style({
  background: 'none',
  border: 'none',
  // ADS-1326: colors.primary (#F43F5E) measures ~3.67:1 on white and ~3.44:1
  // on the `normal` theme's warm-cream body — well under the 4.5:1 AA floor,
  // and what axe-core's smoke gate caught on /login. primaryActive
  // (#BE123C) clears 4.5:1 with a real margin (~6.29:1 / ~5.88:1) on both.
  color: vars.colors.primaryActive,
  cursor: 'pointer',
  fontSize: vars.typography.size.sm,
  padding: '0',
  textAlign: 'left',
  selectors: {
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});
