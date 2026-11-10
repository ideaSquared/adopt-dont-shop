import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const applicantInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const applicantName = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const applicantEmail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
});
