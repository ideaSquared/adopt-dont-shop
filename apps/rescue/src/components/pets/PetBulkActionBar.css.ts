import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  background: vars.background.muted,
  borderRadius: vars.border.radius.sm,
  marginBottom: '0.75rem',
  flexWrap: 'wrap',
});

export const spacer = style({
  flex: 1,
});

export const fullWidthRow = style({
  width: '100%',
});
