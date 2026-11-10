import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const statsBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
});

export const ticketInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const ticketSubject = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const ticketMeta = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
});

export const replyCount = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  color: vars.text.tertiary,
});
