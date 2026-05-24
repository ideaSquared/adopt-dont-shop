import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[3],
});

export const searchBar = style({
  marginBottom: vars.spacing[2],
});

export const petRow = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[3],
  display: 'flex',
  gap: vars.spacing[3],
  alignItems: 'center',
});

export const imageBlock = style({
  width: '60px',
  height: '60px',
  borderRadius: vars.border.radius.base,
  flexShrink: 0,
});

export const textBlock = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[1],
});

export const actions = style({
  display: 'flex',
  gap: vars.spacing[2],
});
