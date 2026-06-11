import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  listStyle: 'none',
  margin: 0,
  padding: '0.5rem 0.75rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  background: vars.background.muted,
  borderRadius: vars.border.radius.sm,
  marginBottom: '0.75rem',
});

export const item = style({
  fontSize: '0.875rem',
});

export const label = style({
  color: vars.text.secondary,
});
