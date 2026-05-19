import { globalStyle, style, keyframes } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Stack handles direction/gap; the className only adds page-level overrides.
export const dashboardContainer = style({});

export const pageHeader = style({
  marginBottom: vars.spacing.md,
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const metricCard = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.xl,
  padding: '1.5rem',
  transition: 'all 0.2s ease',
  ':hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    transform: 'translateY(-2px)',
  },
});

export const metricHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
});

globalStyle(`${metricHeader} span`, {
  fontSize: '1.5rem',
});

export const metricLabel = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const metricValue = style({
  fontSize: '2.25rem',
  fontWeight: '700',
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const metricChangePositive = style({
  fontSize: '0.875rem',
  color: vars.colors.semantic.success['500'],
  fontWeight: '500',
});

export const metricChangeNegative = style({
  fontSize: '0.875rem',
  color: vars.colors.semantic.error['500'],
  fontWeight: '500',
});

const shimmerAnim = keyframes({
  '0%': { backgroundPosition: '-200px 0' },
  '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
});

export const skeletonBlock = style({
  borderRadius: vars.border.radius.md,
  background: `linear-gradient(90deg, ${vars.background.tertiary} 25%, ${vars.background.primary} 50%, ${vars.background.tertiary} 75%)`,
  backgroundSize: '200px 100%',
  animationName: shimmerAnim,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
});

export const errorBanner = style({
  background: vars.colors.semantic.error['100'],
  border: `1px solid ${vars.colors.semantic.error['200']}`,
  borderRadius: vars.border.radius.xl,
  padding: '1.5rem',
  color: vars.colors.semantic.error['800'],
  fontSize: '0.875rem',
});

export const skeletonIcon = style({
  width: '32px',
  height: '32px',
});

export const skeletonLabel = style({
  width: '120px',
  height: '0.875rem',
});

export const skeletonValue = style({
  width: '80px',
  height: '2.25rem',
  marginBottom: '0.5rem',
});

export const skeletonChange = style({
  width: '140px',
  height: '0.875rem',
});

export const widgetPlaceholder = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  textAlign: 'center',
  color: '#6b7280',
});

export const widgetPlaceholderText = style({
  margin: 0,
  fontSize: '0.875rem',
});
