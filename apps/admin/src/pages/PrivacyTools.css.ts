import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  padding: vars.spacing['4'],
  display: 'grid',
  gap: vars.spacing['4'],
  maxWidth: '48rem',
});

export const fieldGroupSpaced = style({
  display: 'grid',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['2'],
});

export const section = style({
  borderTop: `1px solid ${vars.border.color.default}`,
  paddingTop: vars.spacing['3'],
});

export const buttonIcon = style({
  marginRight: vars.spacing['2'],
});

export const deleteButton = style({
  marginTop: vars.spacing['2'],
});
