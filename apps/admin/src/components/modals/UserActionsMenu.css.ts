import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const confirmationContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const confirmationMessage = style({
  margin: '0',
  color: vars.text.secondary,
  lineHeight: '1.5',
});

export const userInfoBox = style({
  padding: vars.spacing['3'],
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: vars.spacing['3'],
  borderTop: `1px solid ${vars.border.color.muted}`,
});

export const dangerBox = style({
  padding: '0.75rem 1rem',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: vars.border.radius.base,
  color: '#991b1b',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
});
