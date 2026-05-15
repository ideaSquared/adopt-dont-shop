import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const toggleButton = style({
  background: vars.background.secondary,
  border: `${vars.border.width.thin} solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.full,
  padding: `${vars.spacing.xs} ${vars.spacing.md}`,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.background.tertiary,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.normal} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
    '&[aria-pressed="true"]': {
      backgroundColor: vars.background.inverse,
      color: vars.text.inverse,
    },
  },
});

export const icon = style({
  fontSize: vars.typography.size.base,
  lineHeight: 1,
});

export const indicator = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: vars.typography.letterSpacing.wide,
});
