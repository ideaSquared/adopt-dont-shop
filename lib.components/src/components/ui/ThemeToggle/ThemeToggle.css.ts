import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const toggleButton = style({
  background: 'none',
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.pill,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  color: vars.text.primary,
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.background.muted,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const icon = style({
  fontSize: vars.typography.size.lg,
});
