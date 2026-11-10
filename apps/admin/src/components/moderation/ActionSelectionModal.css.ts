import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const reportInfo = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
});

export const reportTitle = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  marginBottom: vars.spacing['1'],
});

export const reportText = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.medium,
  color: '#111827',
});

export const formGroup = style({
  marginBottom: vars.spacing['4'],
});
