import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const cardContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  padding: vars.spacing['3'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

export const staffInfo = style({
  flex: 1,
  minWidth: 0,
});

export const staffName = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const staffTitle = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  color: vars.text.secondary,
  fontWeight: vars.typography.weight.medium,
});

export const staffEmail = style({
  margin: 0,
  color: vars.text.tertiary,
  fontSize: vars.typography.size.sm,
  overflowWrap: 'anywhere',
});

export const actions = style({
  display: 'flex',
  flexShrink: 0,
  gap: vars.spacing['2'],
});
