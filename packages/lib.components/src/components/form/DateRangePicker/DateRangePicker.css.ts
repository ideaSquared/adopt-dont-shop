import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['4'],
  alignItems: 'flex-end',
});

export const field = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const label = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const error = style({
  flexBasis: '100%',
  margin: 0,
  fontSize: vars.typography.size.sm,
  color: vars.text.danger,
});
