import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '1.5rem',
});

export const filterRow = style({
  margin: '1rem 0',
});

export const skeletonStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const modalForm = style({
  display: 'grid',
  gap: '0.5rem',
});

export const modalActions = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
});
