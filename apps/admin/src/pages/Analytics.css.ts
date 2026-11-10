import { style } from '@vanilla-extract/css';

import { media, vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: vars.spacing['4'],
  // The 500px minimum overflows phones; drop to a single full-width column.
  '@media': {
    [media.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  },
});

export const chartCard = style({
  minHeight: '350px',
});

export const chartContainer = style({
  width: '100%',
  height: '280px',
  marginTop: vars.spacing['3'],
  position: 'relative',
});

export const barChart = style({
  display: 'flex',
  alignItems: 'flex-end',
  height: '100%',
  gap: '0.75rem',
  padding: `${vars.spacing['3']} 0`,
});

export const bar = style({
  flex: 1,
  borderRadius: '6px 6px 0 0',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
    transform: 'translateY(-4px)',
  },
});

export const barLabel = style({
  position: 'absolute',
  bottom: '-30px',
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  fontWeight: vars.typography.weight.medium,
  whiteSpace: 'nowrap',
});

export const barValue = style({
  position: 'absolute',
  top: '-30px',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const pieChartContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: vars.spacing['5'],
});

export const pieChart = style({
  width: '200px',
  height: '200px',
});

export const pieLegend = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const legendColor = style({
  width: '16px',
  height: '16px',
  borderRadius: vars.border.radius.sm,
  flexShrink: 0,
});

export const legendLabel = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  flex: 1,
});

export const legendValue = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const topItemsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: vars.spacing['3'],
});

export const topItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.875rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.body,
    borderColor: vars.border.color.muted,
  },
});

export const topItemRank = style({
  width: '32px',
  height: '32px',
  borderRadius: vars.border.radius.base,
  background: vars.colors.gradientPrimary,
  color: vars.background.surface,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: vars.typography.weight.bold,
  fontSize: vars.typography.size.sm,
  flexShrink: 0,
});

export const topItemInfo = style({
  flex: 1,
  marginLeft: vars.spacing['3'],
});

export const topItemName = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
});

export const topItemMeta = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  marginTop: '0.125rem',
});

export const topItemValue = style({
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
});

// Clamp the shared SearchToolbar to a compact width so the single time-range
// select sits inline in the header next to the Export button rather than the
// toolbar's default full width. maxWidth (not width) avoids any CSS
// source-order fight with the toolbar's own `width: 100%`.
export const headerFilter = style({
  maxWidth: '220px',
});

export const exportIcon = style({
  marginRight: vars.spacing['2'],
});

export const barLabelCapitalize = style({
  textTransform: 'capitalize',
});
