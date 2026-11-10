import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Stack handles direction/gap; the className only adds page-level overrides.
export const dashboardContainer = style({});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

export const metricLink = style({
  display: 'block',
  color: 'inherit',
  textDecoration: 'none',
});

export const attentionPanel = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.xl,
  padding: vars.spacing['4'],
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
});

export const attentionSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const attentionSectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const attentionSectionTitle = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const attentionLink = style({
  fontSize: vars.typography.size.sm,
  color: vars.colors.primary,
  textDecoration: 'none',
});

export const attentionEmpty = style({
  margin: 0,
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const attentionList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const attentionItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  fontSize: vars.typography.size.sm,
});

export const attentionMeta = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
});
