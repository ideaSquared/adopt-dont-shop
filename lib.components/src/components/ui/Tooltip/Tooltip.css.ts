import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const content = style({
  backgroundColor: vars.colors.neutral['900'],
  color: vars.colors.neutral['50'],
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  maxWidth: '250px',
  lineHeight: vars.typography.lineHeight.normal,
  zIndex: vars.zIndex.tooltip,
  boxShadow: vars.shadows.md,
});

export const arrow = style({
  fill: vars.colors.neutral['900'],
});
