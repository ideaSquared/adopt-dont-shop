import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const statsBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
});

export const ticketInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const ticketSubject = style({
  fontWeight: '600',
  color: vars.text.primary,
});

export const ticketMeta = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
});

export const replyCount = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: vars.text.tertiary,
});
