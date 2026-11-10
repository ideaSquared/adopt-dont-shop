import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const chartContainer = style({
  width: '100%',
  padding: `${vars.spacing['3']} 0`,
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
  marginBottom: vars.spacing['2'],
});

export const stageName = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const stageStats = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  fontSize: vars.typography.size.xs,
});

export const conversionRate = style({
  fontWeight: vars.typography.weight.semibold,
});

export const applicantCount = style({
  color: vars.text.secondary,
});

export const barContainer = style({
  position: 'relative',
  height: '48px',
  background: vars.background.muted,
  borderRadius: vars.border.radius.base,
  overflow: 'hidden',
});

export const barFill = style({
  height: '100%',
  transition: 'all 0.5s ease',
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${vars.spacing['3']}`,
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
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
});

export const dropOffIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
  color: vars.colors.dangerHover,
  margin: `${vars.spacing['1']} 0 ${vars.spacing['2']} 0`,
  paddingLeft: vars.spacing['2'],
});

export const dropOffIcon = style({
  fontSize: vars.typography.size.base,
});

export const summary = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['4'],
  paddingTop: vars.spacing['4'],
  borderTop: `1px solid ${vars.border.color.muted}`,
});

export const summaryItem = style({
  textAlign: 'center',
});

export const summaryLabel = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
  marginBottom: vars.spacing['1'],
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const summaryValue = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
});

export const skeletonList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});
