import { globalStyle, style, keyframes } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: '1.5rem',
  // The 500px minimum overflows phones; drop to a single full-width column.
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const chartCard = style({
  minHeight: '350px',
});

export const chartContainer = style({
  width: '100%',
  height: '280px',
  marginTop: '1rem',
  position: 'relative',
});

export const barChart = style({
  display: 'flex',
  alignItems: 'flex-end',
  height: '100%',
  gap: '0.75rem',
  padding: '1rem 0',
});

export const bar = style({
  flex: 1,
  borderRadius: '6px 6px 0 0',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
    transform: 'translateY(-4px)',
  },
});

export const barLabel = style({
  position: 'absolute',
  bottom: '-30px',
  fontSize: '0.75rem',
  color: vars.text.tertiary,
  fontWeight: '500',
  whiteSpace: 'nowrap',
});

export const barValue = style({
  position: 'absolute',
  top: '-30px',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.primary,
});

export const lineChart = style({
  height: '100%',
  padding: '1rem 0',
  position: 'relative',
});

export const pieChartContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: '2rem',
});

export const pieChart = style({
  width: '200px',
  height: '200px',
});

export const pieLegend = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const legendColor = style({
  width: '16px',
  height: '16px',
  borderRadius: '4px',
  flexShrink: 0,
});

export const legendLabel = style({
  fontSize: '0.875rem',
  color: vars.text.secondary,
  flex: 1,
});

export const legendValue = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.primary,
});

export const metricChangePositive = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.875rem',
  color: '#059669',
  fontWeight: '600',
});

globalStyle(`${metricChangePositive} svg`, {
  fontSize: '1rem',
});

export const metricChangeNegative = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  fontSize: '0.875rem',
  color: vars.colors.dangerHover,
  fontWeight: '600',
});

globalStyle(`${metricChangeNegative} svg`, {
  fontSize: '1rem',
});

export const topItemsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: '1rem',
});

export const topItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.875rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.body,
    borderColor: vars.border.color.muted,
  },
});

export const topItemRank = style({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: vars.colors.gradientPrimary,
  color: vars.background.surface,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '0.875rem',
  flexShrink: 0,
});

export const topItemInfo = style({
  flex: 1,
  marginLeft: '1rem',
});

export const topItemName = style({
  fontWeight: '600',
  color: vars.text.primary,
  fontSize: '0.875rem',
});

export const topItemMeta = style({
  fontSize: '0.75rem',
  color: vars.text.tertiary,
  marginTop: '0.125rem',
});

export const topItemValue = style({
  fontSize: '1.125rem',
  fontWeight: '700',
  color: vars.text.primary,
});

const shimmerAnim = keyframes({
  '0%': { backgroundPosition: '-200px 0' },
  '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
});

export const skeletonBlock = style({
  borderRadius: '6px',
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200px 100%',
  animationName: shimmerAnim,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
});

export const errorBanner = style({
  background: vars.colors.dangerBgSubtle,
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  borderRadius: '8px',
  padding: '1rem',
  color: vars.colors.dangerTextEmphasis,
  fontSize: '0.875rem',
});

export const filterBarOverride = style({
  padding: '0.5rem 0.75rem',
  marginBottom: 0,
});

export const filterGroupOverride = style({
  minWidth: '140px',
  marginBottom: 0,
});

export const exportIcon = style({
  marginRight: '0.5rem',
});

export const skeletonStat80 = style({
  width: '80px',
  height: '1.5rem',
});

export const skeletonStat60 = style({
  width: '60px',
  height: '1.5rem',
});

export const skeletonFullHeight = style({
  height: '100%',
});

export const skeletonRow3rem = style({
  height: '3rem',
});

export const skeletonPie = style({
  width: '200px',
  height: '200px',
  borderRadius: '50%',
});

export const chartEmptyState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#9ca3af',
  fontSize: '0.875rem',
});

export const pieEmptyState = style({
  color: '#9ca3af',
  fontSize: '0.875rem',
});

export const emptyStatePadded = style({
  color: '#9ca3af',
  fontSize: '0.875rem',
  padding: '1rem 0',
});

export const barLabelCapitalize = style({
  textTransform: 'capitalize',
});
