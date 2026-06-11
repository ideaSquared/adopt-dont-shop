import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[3],
  display: 'flex',
  gap: vars.spacing[3],
});

export const imageBlock = style({
  width: '80px',
  height: '80px',
  borderRadius: vars.border.radius.base,
  flexShrink: 0,
});

export const content = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const statusRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});
