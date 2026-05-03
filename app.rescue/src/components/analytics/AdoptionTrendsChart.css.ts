import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chartContainer = style({
  width: '100%',
  padding: '1rem 0',
});

export const svgContainer = style({
  width: '100%',
  overflow: 'visible',
});

export const gridLine = style({
  stroke: vars.colors.neutral['200'],
  strokeWidth: '1',
  strokeDasharray: '4 4',
});

export const gridLabel = style({
  fill: vars.text.tertiary,
  fontSize: '0.75rem',
  fontFamily: 'inherit',
});

export const axisLabel = style({
  fill: vars.text.secondary,
  fontSize: '0.75rem',
  fontFamily: 'inherit',
});

export const linePath = style({
  fill: 'none',
  stroke: vars.colors.primary['500'],
  strokeWidth: '3',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))',
});

export const areaPath = style({
  fill: 'url(#areaGradient)',
  opacity: 0.2,
});

export const dataPoint = recipe({
  base: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fill: 'white',
    stroke: vars.colors.primary['500'],
  },
  variants: {
    active: {
      true: { strokeWidth: '3' },
      false: { strokeWidth: '2' },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const tooltipContainer = style({
  position: 'absolute',
  transform: 'translate(-50%, -100%)',
  background: vars.colors.neutral['900'],
  color: 'white',
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  '::after': {
    content: "''",
    position: 'absolute',
    bottom: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `4px solid ${vars.colors.neutral['900']}`,
  },
});

export const tooltipDate = style({
  fontWeight: '600',
  marginBottom: '0.125rem',
});

export const tooltipValue = style({
  color: vars.colors.primary['300'],
  fontWeight: '500',
});

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
});

export const loadingSkeleton = style({
  width: '100%',
  background: vars.colors.neutral['100'],
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
    background: `linear-gradient(90deg, transparent, ${vars.colors.neutral['200']}, transparent)`,
    animation: `${shimmer} 1.5s infinite`,
  },
});
