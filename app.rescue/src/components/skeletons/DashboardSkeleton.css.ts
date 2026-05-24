import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing[3],
  marginBottom: vars.spacing[4],
});

export const metricCard = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[3],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.spacing[3],
  marginBottom: vars.spacing[4],
});

export const chartCard = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[3],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const activityLines = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});
