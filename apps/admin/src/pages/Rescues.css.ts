import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const rescueInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const rescueName = style({
  fontWeight: '600',
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
  fontSize: '0.875rem',
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
});
