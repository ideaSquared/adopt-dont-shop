import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  maxWidth: '32rem',
});

export const twoColumns = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
  gap: vars.spacing['4'],
});

export const readOnlyValue = style({
  margin: 0,
  color: vars.text.primary,
});

export const hint = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
});

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
});

export const statusMessage = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
});
