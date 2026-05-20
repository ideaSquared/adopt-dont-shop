import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const content = style({
  backgroundColor: vars.text.primary,
  color: vars.background.body,
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  maxWidth: '250px',
  lineHeight: vars.typography.lineHeight.normal,
  zIndex: vars.zIndex.tooltip,
  boxShadow: vars.shadows.base,
});

export const arrow = style({
  fill: vars.text.primary,
});
