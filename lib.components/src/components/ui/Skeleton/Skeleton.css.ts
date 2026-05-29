import { style, keyframes } from '@vanilla-extract/css';
import { vars } from '../../../styles/theme.css';

const shimmer = keyframes({
  '0%': { backgroundPosition: '200% 0' },
  '100%': { backgroundPosition: '-200% 0' },
});

export const skeletonBase = style({
  background: `linear-gradient(90deg, ${vars.background.muted} 25%, ${vars.border.color.muted} 50%, ${vars.background.muted} 75%)`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.5s ease-in-out infinite`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
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
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[4],
});

export const tableCell = style({
  padding: vars.spacing[3],
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
  borderRadius: vars.border.radius.sm,
  marginBottom: '0.25rem',
});

export const textRowSecondary = style({
  height: '0.75rem',
  width: '70%',
  borderRadius: vars.border.radius.sm,
});

export const genericTextRow = style({
  height: '0.875rem',
  borderRadius: vars.border.radius.sm,
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
  marginBottom: vars.spacing[3],
});

export const cardTextPrimary = style({
  height: '1rem',
  borderRadius: vars.border.radius.sm,
  marginBottom: '0.375rem',
});

export const cardTextSecondary = style({
  height: '0.875rem',
  width: '60%',
  borderRadius: vars.border.radius.sm,
});
