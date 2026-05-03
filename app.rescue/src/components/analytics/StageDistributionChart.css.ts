import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
});

export const chartContainer = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const donutContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  height: '280px',
});

export const svgContainer = style({
  maxWidth: '280px',
  maxHeight: '280px',
  transform: 'rotate(-90deg)',
  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
});

export const donutSegment = style({
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  transformOrigin: 'center',
  ':hover': {
    opacity: 0.8,
    filter: 'brightness(1.1)',
  },
});

export const donutSegmentActive = style({
  filter: 'brightness(1.15)',
});

export const centerLabel = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  pointerEvents: 'none',
});

export const centerValue = style({
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  lineHeight: '1',
});

export const centerText = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  marginTop: '0.25rem',
});

export const legend = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '0.75rem',
});

export const legendItem = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f9fafb',
    },
  },
  variants: {
    active: {
      true: { background: '#f9fafb' },
      false: { background: 'transparent' },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const colorDot = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flexShrink: 0,
});

export const legendLabel = style({
  flex: 1,
  minWidth: 0,
});

export const legendName = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#111827',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const legendValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.125rem',
});

export const percentage = style({
  fontWeight: '600',
  color: '#111827',
});

export const loadingSkeleton = style({
  width: '100%',
  height: '280px',
  background: '#f3f4f6',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden',
  '::after': {
    content: "''",
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
    animation: `${shimmer} 1.5s infinite`,
  },
});
