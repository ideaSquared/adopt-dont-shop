import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const content = style({
  backgroundColor: vars.text.primary,
  color: vars.background.body,
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.sm,
  maxWidth: '16rem',
  lineHeight: vars.typography.lineHeight.normal,
  zIndex: vars.zIndex.tooltip,
  boxShadow: vars.shadows.base,
});

export const arrow = style({
  fill: vars.text.primary,
});
