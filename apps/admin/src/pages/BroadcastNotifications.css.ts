import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxWidth: '720px',
});

export const channelsRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const actions = style({
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
});
