import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const rescueInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const rescueName = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const rescueDetail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
});

globalStyle(`${rescueDetail} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionButtons = style({
  display: 'flex',
  gap: vars.spacing['2'],
});
