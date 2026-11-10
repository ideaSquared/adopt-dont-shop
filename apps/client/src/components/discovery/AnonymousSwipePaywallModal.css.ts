import { style } from '@vanilla-extract/css';

export const body = style({
  textAlign: 'center',
});

export const subtitle = style({
  fontSize: '1rem',
  color: '#6c757d',
  margin: '0 0 1.5rem 0',
});

export const actions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});
