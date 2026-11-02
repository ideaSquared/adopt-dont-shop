import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';
import { control } from '../control.css';

export const input = style({
  boxSizing: 'border-box',
  width: '100%',
  height: control.height.md,
  padding: `0 ${control.paddingX}`,
  border: `${vars.border.width.thin} solid ${control.borderColor}`,
  borderRadius: control.radius,
  fontSize: control.fontSize.md,
  color: vars.text.primary,
  background: control.background,
  transition: `all ${vars.transitions.fast}`,

  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.border.color.focus,
      boxShadow: control.focusRing,
    },
    '&:disabled': {
      background: vars.background.disabled,
      cursor: 'not-allowed',
    },
  },
});
