import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['5'],
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const providerButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['2'],
  width: '100%',
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  background: vars.background.body,
  color: vars.text.primary,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.medium,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: vars.background.surface,
      borderColor: vars.colors.primary,
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: vars.shadows.focus,
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});

export const providerIcon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  flexShrink: 0,
});

export const divider = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  margin: `${vars.spacing['2']} 0`,
  color: vars.text.tertiary,
  fontSize: vars.typography.size.sm,
});

globalStyle(`${divider}::before, ${divider}::after`, {
  content: '""',
  flex: '1',
  height: '1px',
  background: vars.border.color.default,
});

export const devNotice = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  textAlign: 'center',
  margin: '0',
});
