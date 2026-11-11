import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const reportInfo = style({
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
});

export const reportTitle = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  marginBottom: vars.spacing['1'],
});

export const reportText = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const formGroup = style({
  marginBottom: vars.spacing['4'],
});
