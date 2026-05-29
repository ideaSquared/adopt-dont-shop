import { globalStyle, style, keyframes } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Stack handles direction/gap; the className only adds page-level overrides.
export const dashboardContainer = style({});

export const pageHeader = style({
  marginBottom: vars.spacing['3'],
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const metricCard = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.xl,
  padding: '1.5rem',
  transition: 'all 0.2s ease',
  display: 'block',
  color: 'inherit',
  textDecoration: 'none',
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
  color: vars.colors.success,
  fontWeight: '500',
});

export const metricChangeNegative = style({
  fontSize: '0.875rem',
  color: vars.colors.danger,
  fontWeight: '500',
});

export const metricChangeNeutral = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  fontWeight: '500',
});

const shimmerAnim = keyframes({
  '0%': { backgroundPosition: '-200px 0' },
  '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
});

export const skeletonBlock = style({
  borderRadius: vars.border.radius.base,
  background: `linear-gradient(90deg, ${vars.background.muted} 25%, ${vars.background.body} 50%, ${vars.background.muted} 75%)`,
  backgroundSize: '200px 100%',
  animationName: shimmerAnim,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
});

export const errorBanner = style({
  background: vars.colors.dangerBgSubtle,
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  borderRadius: vars.border.radius.xl,
  padding: '1.5rem',
  color: vars.colors.dangerTextEmphasis,
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
