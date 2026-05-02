import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chartContainer = style({
  width: '100%',
  padding: '1rem 0',
});

export const funnelStage = recipe({
  base: {
    marginBottom: '0.75rem',
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

export const stageHeader = style({
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

export const stageStats = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  fontSize: '0.75rem',
});

export const conversionRate = style({
  fontWeight: '600',
});

export const applicantCount = style({
  color: vars.text.secondary,
});

export const barContainer = style({
  position: 'relative',
  height: '48px',
  background: vars.colors.neutral['100'],
  borderRadius: '8px',
  overflow: 'hidden',
});

export const barFill = style({
  height: '100%',
  transition: 'all 0.5s ease',
  display: 'flex',
  alignItems: 'center',
  padding: '0 1rem',
  position: 'absolute',
  top: 0,
  left: 0,
  '::after': {
    content: "''",
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid rgba(255, 255, 255, 0.3)',
    borderTop: '8px solid transparent',
    borderBottom: '8px solid transparent',
  },
});

export const barLabel = style({
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '600',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
});

export const dropOffIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  color: vars.colors.semantic.error['600'],
  margin: '0.25rem 0 0.5rem 0',
  paddingLeft: '0.5rem',
});

export const dropOffIcon = style({
  fontSize: '1rem',
});

export const summary = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '1rem',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.colors.neutral['200']}`,
});

export const summaryItem = style({
  textAlign: 'center',
});

export const summaryLabel = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
  marginBottom: '0.25rem',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const summaryValue = style({
  fontSize: '1.5rem',
  fontWeight: '700',
  color: vars.text.primary,
});

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
});

export const loadingSkeletonRow = style({
  height: '48px',
  background: vars.colors.neutral['100'],
  borderRadius: '8px',
  marginBottom: '0.75rem',
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
