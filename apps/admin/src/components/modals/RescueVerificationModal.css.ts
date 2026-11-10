import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const infoBox = style({
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: '1.25rem',
});

export const infoLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
});
