import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '1100px',
  margin: '0 auto',
});

export const inlineForm = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  alignItems: 'flex-end',
});

export const userIdSubtext = style({
  color: vars.text.tertiary,
  fontSize: vars.typography.size.xs,
});
