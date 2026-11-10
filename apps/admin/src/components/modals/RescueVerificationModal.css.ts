import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const infoBox = style({
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: '1.25rem',
});

export const infoLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: '#111827',
  fontWeight: vars.typography.weight.medium,
});
