import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  marginLeft: vars.spacing['2'],
  padding: '0.125rem 0.5rem',
  borderRadius: vars.border.radius.pill,
  fontSize: '0.6875rem',
  fontWeight: vars.typography.weight.medium,
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryActive,
  border: `1px solid ${vars.colors.primaryBorderSubtle}`,
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
});
