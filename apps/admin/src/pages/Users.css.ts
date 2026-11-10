import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const userInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const userDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const userName = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const userEmail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
});
