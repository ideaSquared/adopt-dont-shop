import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const actionGroup = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignItems: 'center',
});

export const slugCell = style({
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
});

export const capitalize = style({
  textTransform: 'capitalize',
});

export const slugInputRow = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignItems: 'center',
});
