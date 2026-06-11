import { keyframes, style } from '@vanilla-extract/css';

const shimmer = keyframes({
  '0%': { backgroundPosition: '-400px 0' },
  '100%': { backgroundPosition: '400px 0' },
});

export const stackContainer = style({
  position: 'relative',
  width: '100%',
  maxWidth: '420px',
  height: '640px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '@media': {
    '(max-width: 768px)': {
      height: 'min(70vh, 660px)',
      maxWidth: 'min(92vw, 420px)',
    },
  },
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  textAlign: 'center',
  color: '#475569',
  padding: '2rem',
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  borderRadius: '24px',
  border: '2px dashed #cbd5e1',
});

export const emptyIcon = style({
  fontSize: '4rem',
  marginBottom: '1rem',
  opacity: 0.7,
});

export const emptyTitle = style({
  fontSize: '1.4rem',
  fontWeight: 700,
  marginBottom: '0.5rem',
  color: '#1e293b',
});

export const emptyText = style({
  fontSize: '0.95rem',
  lineHeight: 1.5,
  maxWidth: '320px',
  color: '#64748b',
});

export const skeletonCard = style({
  position: 'absolute',
  width: '100%',
  maxWidth: '380px',
  height: '620px',
  borderRadius: '24px',
  background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 40%, #f1f5f9 80%)',
  backgroundSize: '800px 100%',
  animationName: shimmer,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.18)',
  '@media': {
    '(max-width: 768px)': {
      maxWidth: 'min(92vw, 420px)',
      height: 'min(70vh, 640px)',
    },
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});
