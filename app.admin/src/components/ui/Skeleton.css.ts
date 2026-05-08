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

export const tableCell = style({
  padding: '1rem',
});

export const checkboxSkeleton = style({
  width: '1rem',
  height: '1rem',
  borderRadius: '2px',
});

export const avatarSkeleton = style({
  width: '2rem',
  height: '2rem',
  borderRadius: '50%',
  flexShrink: 0,
});

export const flexFill = style({
  flex: 1,
});

export const textRowPrimary = style({
  height: '0.875rem',
  borderRadius: '4px',
  marginBottom: '0.25rem',
});

export const textRowSecondary = style({
  height: '0.75rem',
  width: '70%',
  borderRadius: '4px',
});

export const genericTextRow = style({
  height: '0.875rem',
  borderRadius: '4px',
});

export const avatarLarge = style({
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  flexShrink: 0,
});

export const avatarRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
});

export const cardTextPrimary = style({
  height: '1rem',
  borderRadius: '4px',
  marginBottom: '0.375rem',
});

export const cardTextSecondary = style({
  height: '0.875rem',
  width: '60%',
  borderRadius: '4px',
});
