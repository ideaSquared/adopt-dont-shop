import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  overflow: 'hidden',
  height: '100%',
});

export const imagePlaceholder = style({
  width: '100%',
  aspectRatio: '4/3',
});

export const content = style({
  padding: vars.spacing[3],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const detailRow = style({
  display: 'flex',
  gap: vars.spacing[2],
});
