import { globalStyle, style, keyframes } from '@vanilla-extract/css';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: '1.5rem',
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
  color: '#6b7280',
  fontWeight: '500',
  whiteSpace: 'nowrap',
});

export const barValue = style({
  position: 'absolute',
  top: '-30px',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
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
  color: '#374151',
  flex: 1,
});

export const legendValue = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
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
  color: '#dc2626',
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
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#d1d5db',
  },
});

export const topItemRank = style({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
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
  color: '#111827',
  fontSize: '0.875rem',
});

export const topItemMeta = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.125rem',
});

export const topItemValue = style({
  fontSize: '1.125rem',
  fontWeight: '700',
  color: '#111827',
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
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '1rem',
  color: '#991b1b',
  fontSize: '0.875rem',
});
