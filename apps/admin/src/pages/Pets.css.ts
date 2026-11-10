import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const petInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const petName = style({
  fontWeight: '600',
  color: vars.text.primary,
});

export const petDetail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

export const dimDash = style({
  color: vars.text.muted,
});
