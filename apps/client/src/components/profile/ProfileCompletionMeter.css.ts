import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const meter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: '0.75rem 1rem',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const headerLabel = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const dismissButton = style({
  background: 'transparent',
  border: 'none',
  fontSize: vars.typography.size.xl,
  color: vars.text.secondary,
  cursor: 'pointer',
  padding: `0 ${vars.spacing['1']}`,
  lineHeight: 1,
  ':hover': { color: vars.text.primary },
});

export const segments = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: vars.spacing['2'],
});

const segmentBase = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start' as const,
  padding: '0.5rem 0.75rem',
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  transition: 'background 120ms ease',
};

export const segmentDone = style({
  ...segmentBase,
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryTextEmphasis,
  ':hover': { background: vars.colors.primaryBorderSubtle },
});

export const segmentTodo = style({
  ...segmentBase,
  background: vars.background.muted,
  color: vars.text.primary,
  border: `1px dashed ${vars.border.color.strong}`,
  ':hover': { background: vars.background.surface },
});

export const segmentLabel = style({
  fontWeight: vars.typography.weight.semibold,
});

export const segmentStatus = style({
  fontSize: vars.typography.size.xs,
  opacity: 0.8,
});

export const celebration = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: vars.spacing['3'],
  background: vars.colors.gradientBrand,
  color: vars.text.inverse,
  borderRadius: vars.border.radius.lg,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const celebrationIcon = style({
  fontSize: '2rem',
});

export const celebrationBody = style({
  flex: 1,
});

export const celebrationTitle = style({
  fontSize: '1.1rem',
  fontWeight: vars.typography.weight.bold,
  margin: `0 0 ${vars.spacing['1']} 0`,
});

export const celebrationSubtitle = style({
  fontSize: '0.9rem',
  margin: 0,
  opacity: 0.95,
});

export const celebrationClose = style({
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  fontSize: vars.typography.size['2xl'],
  cursor: 'pointer',
  padding: `0 ${vars.spacing['2']}`,
  lineHeight: 1,
});
