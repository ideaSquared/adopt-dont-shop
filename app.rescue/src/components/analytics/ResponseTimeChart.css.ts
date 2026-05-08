import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chartContainer = style({
  width: '100%',
  padding: '1rem 0',
});

export const barGroup = recipe({
  base: {
    marginBottom: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateX(4px)',
    },
  },
  variants: {
    active: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const stageLabel = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
});

export const stageName = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.primary,
});

export const timeValue = recipe({
  base: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  variants: {
    compliant: {
      true: { color: vars.colors.semantic.success['600'] },
      false: { color: vars.colors.semantic.error['600'] },
    },
  },
  defaultVariants: {
    compliant: true,
  },
});

export const barsContainer = style({
  position: 'relative',
  height: '40px',
});

export const bar = style({
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  borderRadius: '8px',
  transition: 'all 0.3s ease',
});

export const targetBar = style({
  background: vars.colors.neutral['200'],
  opacity: 0.6,
  zIndex: 1,
});

export const actualBar = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.75rem',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    zIndex: 2,
  },
  variants: {
    compliant: {
      true: {
        background: `linear-gradient(135deg, ${vars.colors.semantic.success['500']}, ${vars.colors.semantic.success['600']})`,
      },
      false: {
        background: `linear-gradient(135deg, ${vars.colors.semantic.error['500']}, ${vars.colors.semantic.error['600']})`,
      },
    },
    active: {
      true: {
        transform: 'scaleY(1.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      false: {},
    },
  },
  defaultVariants: {
    compliant: true,
    active: false,
  },
});

export const barLabel = style({
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: '600',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
});

export const complianceIndicator = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.75rem',
    marginTop: '0.375rem',
  },
  variants: {
    compliant: {
      true: { color: vars.colors.semantic.success['600'] },
      false: { color: vars.colors.semantic.error['600'] },
    },
  },
  defaultVariants: {
    compliant: true,
  },
});

export const complianceIcon = style({
  fontSize: '1rem',
});

export const legend = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2rem',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.colors.neutral['200']}`,
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: vars.text.secondary,
});

export const legendColor = style({
  width: '16px',
  height: '16px',
  borderRadius: '4px',
});

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
});

export const loadingSkeletonRow = style({
  height: '40px',
  background: vars.colors.neutral['100'],
  borderRadius: '8px',
  marginBottom: '1.5rem',
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

export const emptyState = style({
  textAlign: 'center',
  padding: '2rem',
  color: '#6b7280',
});

export const legendColorGreen = style({
  background: '#10B981',
});

export const legendColorRed = style({
  background: '#EF4444',
});

export const legendColorGray = style({
  background: '#D1D5DB',
});
