import { style, keyframes } from '@vanilla-extract/css';

const shimmer = keyframes({
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
});

export const skeletonBase = style({
  background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.5s ease-in-out infinite`,
});

export const textLine = style({
  marginBottom: '0.5rem',
  selectors: {
    '&:last-child': {
      marginBottom: '0',
    },
  },
});

export const cellContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const cardContainer = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});
