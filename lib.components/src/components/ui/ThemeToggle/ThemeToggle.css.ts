import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const toggleButton = style({
  background: 'none',
  border: `${vars.border.width.thin} solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.full,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
  color: vars.text.primary,
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.background.overlay,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.normal} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const icon = style({
  fontSize: vars.typography.size.lg,
});
