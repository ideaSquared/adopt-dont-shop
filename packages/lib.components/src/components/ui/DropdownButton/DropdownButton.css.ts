import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const buttonTrigger = style({
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  backgroundColor: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
  selectors: {
    '&:hover': { backgroundColor: vars.background.muted },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: vars.spacing['1'],
    },
    '&:disabled': { color: vars.text.disabled, cursor: 'not-allowed' },
  },
});
