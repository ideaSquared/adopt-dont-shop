import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Stack handles direction/gap; the className only adds page-level overrides.
export const dashboardContainer = style({});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
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
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
});

export const attentionSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const attentionSectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const attentionSectionTitle = style({
  margin: 0,
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.text.primary,
});

export const attentionLink = style({
  fontSize: '0.875rem',
  color: vars.colors.primary,
  textDecoration: 'none',
});

export const attentionEmpty = style({
  margin: 0,
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});

export const attentionList = style({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const attentionItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  fontSize: '0.875rem',
});

export const attentionMeta = style({
  fontSize: '0.75rem',
  color: vars.text.tertiary,
});
