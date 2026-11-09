import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const panelTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const panelDescription = style({
  margin: 0,
  color: vars.text.secondary,
});
