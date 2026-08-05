import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: vars.spacing['5'],
  gap: vars.spacing['2'],
});

export const title = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.colors.dangerTextEmphasis,
});

export const message = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  lineHeight: '1.5',
  color: vars.text.muted,
  maxWidth: '400px',
});

export const retryButton = style({
  marginTop: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  cursor: 'pointer',
  border: `1px solid ${vars.colors.primary}`,
  backgroundColor: vars.colors.primary,
  color: vars.background.body,
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.primaryActive,
      borderColor: vars.colors.primaryActive,
    },
    '&:focus': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});
