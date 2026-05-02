import { globalStyle, keyframes, style } from '@vanilla-extract/css';

const loading = keyframes({
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
});

export const gridContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem',
  marginBottom: 0,
  marginTop: 0,
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '0.75rem',
    },
    '(min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.25rem',
    },
  },
});

export const emptyState = style({
  padding: '3rem',
  textAlign: 'center',
  gridColumn: '1 / -1',
  selectors: {
    '& .empty-icon': {
      fontSize: '3rem',
      marginBottom: '1rem',
    },
  },
});

globalStyle(`${emptyState} h3`, {
  marginBottom: '0.5rem',
  color: '#111827',
});

globalStyle(`${emptyState} p`, {
  color: '#6b7280',
  marginBottom: '1.5rem',
});

export const loadingGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem',
  marginBottom: 0,
  '@media': {
    '(min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.5rem',
    },
  },
});

export const loadingCard = style({
  padding: '1rem',
  minHeight: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animationName: loading,
  animationDuration: '1.5s',
  animationIterationCount: 'infinite',
});

export const paginationContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '2rem',
  padding: '1rem',
  '@media': {
    '(max-width: 768px)': {
      flexWrap: 'wrap',
      gap: '0.5rem',
    },
  },
});
