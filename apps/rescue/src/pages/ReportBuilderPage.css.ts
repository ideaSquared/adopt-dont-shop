import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  padding: '12px',
  background: '#f9fafb',
  borderRadius: '8px',
});
