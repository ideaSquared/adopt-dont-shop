import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['6'],
});

export const fieldStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const quietHoursGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
});

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.spacing['4'],
});

export const savedMessage = style({
  margin: 0,
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
});

export const loading = style({
  color: vars.text.secondary,
});

export const moreOptions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const moreOptionsToggle = style({
  cursor: 'pointer',
  color: vars.text.link,
  fontWeight: vars.typography.weight.medium,
  marginBottom: vars.spacing['4'],
});
