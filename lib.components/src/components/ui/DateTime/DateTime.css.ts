import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const clickableTime = style({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const clocksContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const clockContainer = style({
  backgroundColor: vars.background.overlay,
  padding: vars.spacing.sm,
  borderRadius: vars.border.radius.md,
  boxShadow: vars.shadows.sm,
});

export const tooltipContent = style({
  backgroundColor: vars.background.overlay,
  padding: vars.spacing.sm,
  borderRadius: vars.border.radius.lg,
  boxShadow: vars.shadows.md,
  fontSize: vars.typography.size.sm,
  zIndex: vars.zIndex.tooltip,
});

export const tooltipArrow = style({
  fill: vars.background.overlay,
});
