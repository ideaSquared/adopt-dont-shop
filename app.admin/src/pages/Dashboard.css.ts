import { globalStyle, style, keyframes } from '@vanilla-extract/css';

export const dashboardContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const pageHeader = style({
  marginBottom: '1rem',
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const metricCard = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
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
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const metricValue = style({
  fontSize: '2.25rem',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '0.5rem',
});

export const metricChangePositive = style({
  fontSize: '0.875rem',
  color: '#10b981',
  fontWeight: '500',
});

export const metricChangeNegative = style({
  fontSize: '0.875rem',
  color: '#ef4444',
  fontWeight: '500',
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
  borderRadius: '12px',
  padding: '1.5rem',
  color: '#991b1b',
  fontSize: '0.875rem',
});
