import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[4],
});

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});
