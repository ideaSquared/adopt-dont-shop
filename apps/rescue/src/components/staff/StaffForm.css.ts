import { vars } from '@adopt-dont-shop/lib.components/theme';
import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const formActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.spacing['3'],
});
