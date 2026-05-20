import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const banner = style({
  position: 'fixed',
  insetInline: vars.spacing['3'],
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${vars.spacing['3']})`,
  zIndex: vars.zIndex.sticky,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
  backgroundColor: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  boxShadow: vars.shadows.lg,
  '@media': {
    '(min-width: 640px)': {
      left: 'auto',
      right: vars.spacing['4'],
      maxWidth: '420px',
      flexDirection: 'row',
      alignItems: 'center',
    },
  },
});

export const content = style({
  flex: 1,
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const description = style({
  margin: 0,
  marginTop: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.snug,
});

export const actions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignSelf: 'stretch',
  '@media': {
    '(min-width: 640px)': {
      alignSelf: 'center',
    },
  },
});

const buttonBase = {
  flex: 1,
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
} as const;

export const installButton = style({
  ...buttonBase,
  border: `1px solid ${vars.colors.primary}`,
  backgroundColor: vars.colors.primary,
  color: vars.text.inverse,
  selectors: {
    ...buttonBase.selectors,
    '&:hover': {
      backgroundColor: vars.colors.primaryActive,
      borderColor: vars.colors.primaryActive,
    },
  },
});

export const dismissButton = style({
  ...buttonBase,
  border: `1px solid ${vars.border.color.default}`,
  backgroundColor: 'transparent',
  color: vars.text.secondary,
  selectors: {
    ...buttonBase.selectors,
    '&:hover': {
      backgroundColor: vars.background.body,
      borderColor: vars.border.color.strong,
    },
  },
});
