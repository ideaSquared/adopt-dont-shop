import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
});

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
});

export const panel = style({
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
});

export const schedulePanel = style({
  background: '#f9fafb',
});

export const sharePanel = style({
  background: '#ecfdf5',
});

export const scheduleRow = style({
  display: 'flex',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['2'],
});

export const cronInput = style({
  minWidth: '160px',
});

export const emailInput = style({
  flex: 1,
});

export const shareCode = style({
  wordBreak: 'break-all',
});
