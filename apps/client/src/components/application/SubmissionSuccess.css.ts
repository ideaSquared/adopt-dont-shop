import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  padding: vars.spacing['5'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  textAlign: 'center',
});

export const heading = style({
  fontSize: vars.typography.size['2xl'],
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['2']} 0`,
});

export const intro = style({
  color: vars.text.secondary,
  margin: `0 0 ${vars.spacing['4']} 0`,
});

export const nextSteps = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  textAlign: 'left',
  margin: `0 auto ${vars.spacing['5']}`,
  maxWidth: '480px',
  padding: 0,
  listStyle: 'none',
});

export const nextStepItem = style({
  padding: '0.75rem 1rem',
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  color: vars.text.primary,
  fontSize: '0.9375rem',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});
