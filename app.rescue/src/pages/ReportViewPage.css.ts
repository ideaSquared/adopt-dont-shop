import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
});

export const headerRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const headerActions = style({
  display: 'flex',
  gap: '8px',
});

export const panel = style({
  padding: '12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const schedulePanel = style({
  background: '#f9fafb',
});

export const sharePanel = style({
  background: '#ecfdf5',
});

export const scheduleRow = style({
  display: 'flex',
  gap: '8px',
  marginTop: '8px',
});

export const cronInput = style({
  padding: '6px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
});

export const emailInput = style({
  flex: 1,
  padding: '6px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
});

export const shareCode = style({
  wordBreak: 'break-all',
});
