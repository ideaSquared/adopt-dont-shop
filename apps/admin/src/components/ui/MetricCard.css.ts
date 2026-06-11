import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const loading = keyframes({
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
});

export const card = recipe({
  base: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    },
  },
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        ':hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          transform: 'translateY(-2px)',
        },
      },
      false: {
        cursor: 'default',
      },
    },
  },
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
});

export const icon = style({
  fontSize: '1.5rem',
  lineHeight: '1',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  flex: 1,
});

export const value = style({
  fontSize: '2.25rem',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '0.5rem',
  lineHeight: '1',
});

export const change = recipe({
  base: {
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  variants: {
    positive: {
      true: { color: '#10b981' },
      false: { color: '#ef4444' },
    },
  },
});

export const loadingSkeleton = style({
  background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: `${loading} 1.5s ease-in-out infinite`,
  borderRadius: '4px',
  height: '1.5rem',
  width: '100%',
});

export const loadingValueSkeleton = style([
  loadingSkeleton,
  {
    height: '2.25rem',
    marginBottom: '0.5rem',
  },
]);

export const loadingLabelSkeleton = style([
  loadingSkeleton,
  {
    height: '0.875rem',
    width: '60%',
  },
]);
