import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['4'],
  alignItems: 'flex-end',
});

export const presets = style({
  flexBasis: '100%',
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
});

export const presetButton = style({
  padding: `${vars.spacing['1']} ${vars.spacing['3']}`,
  fontFamily: vars.typography.family.sans,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.colors.primaryTextEmphasis,
  background: vars.colors.primaryBgSubtle,
  border: `${vars.border.width.thin} solid ${vars.colors.primaryBorderSubtle}`,
  borderRadius: vars.border.radius.pill,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover:not(:disabled)': {
      background: vars.colors.primary,
      borderColor: vars.colors.primary,
      color: vars.text.inverse,
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
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const label = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const error = style({
  flexBasis: '100%',
  margin: 0,
  fontSize: vars.typography.size.sm,
  color: vars.text.danger,
});
