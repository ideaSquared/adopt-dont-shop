import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'grid',
  gap: '0.75rem',
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: '8rem 1fr',
  gap: '0.25rem 1rem',
});
