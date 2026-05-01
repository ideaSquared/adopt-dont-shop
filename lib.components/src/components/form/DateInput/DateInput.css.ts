import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const input = style({
  width: '100%',
  padding: vars.spacing.sm,
  border: `${vars.border.width.thin} solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.sm,
  fontSize: vars.typography.size.base,
  color: vars.text.primary,
  background: vars.background.primary,
  transition: `all ${vars.transitions.fast}`,

  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.border.color.focus,
    },
    '&:disabled': {
      background: vars.background.disabled,
      cursor: 'not-allowed',
    },
  },
});
