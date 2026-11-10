import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chartContainer = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
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
  fontWeight: vars.typography.weight.bold,
  color: '#111827',
  lineHeight: '1',
});

export const centerText = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  marginTop: vars.spacing['1'],
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
    borderRadius: vars.border.radius.base,
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
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: '#111827',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const legendValue = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  marginTop: '0.125rem',
});

export const percentage = style({
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});
