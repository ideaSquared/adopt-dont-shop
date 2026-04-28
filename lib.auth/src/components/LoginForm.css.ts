import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['6'],
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const styledAlert = style({
  marginBottom: vars.spacing['4'],
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
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
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
  padding: vars.spacing['3'],
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  fontSize: vars.typography.size.xl,
  letterSpacing: vars.typography.letterSpacing.widest,
  textAlign: 'center',
  maxWidth: '200px',
  background: vars.background.primary,
  color: vars.text.primary,
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.colors.primary['500'],
      boxShadow: `0 0 0 2px ${vars.colors.primary['100']}`,
    },
  },
});

export const backLink = style({
  background: 'none',
  border: 'none',
  color: vars.colors.primary['500'],
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
