import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  maxWidth: '720px',
});

export const channelsRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
});

export const actions = style({
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
});
