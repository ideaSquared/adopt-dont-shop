import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['3'],
  padding: '12px',
  background: '#f9fafb',
  borderRadius: vars.border.radius.base,
});
