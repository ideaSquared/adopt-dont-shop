import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: vars.spacing['4'],
});

export const filterRow = style({
  margin: `${vars.spacing['3']} 0`,
});

export const skeletonStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const modalForm = style({
  display: 'grid',
  gap: vars.spacing['2'],
});

export const modalActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'flex-end',
});
