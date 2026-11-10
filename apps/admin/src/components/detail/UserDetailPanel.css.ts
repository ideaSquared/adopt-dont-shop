import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerInfo = style({
  flex: 1,
  minWidth: 0,
});

export const headerName = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const headerEmail = style({
  margin: 0,
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const headerBadges = style({
  display: 'flex',
  gap: '0.375rem',
  flexShrink: 0,
});

// ── Overview tab ──────────────────────────────────────────────────

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.spacing['3'],
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const detailLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: '0.6875rem',
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.muted,
});

export const detailValue = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
});

export const emptyValue = style({
  color: vars.text.muted,
  fontStyle: 'italic',
});

// ── Edit tab ──────────────────────────────────────────────────────

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
});

export const formActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'flex-end',
  paddingTop: '0.75rem',
  borderTop: `1px solid ${vars.border.color.default}`,
});

// ── Actions tab ──────────────────────────────────────────────────

export const actionsSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const actionGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const actionGroupLabel = style({
  fontSize: '0.6875rem',
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.muted,
});

// ── Activity tab ──────────────────────────────────────────────────

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
  ':last-child': {
    borderBottom: 'none',
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.primary,
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: vars.text.primary,
  margin: 0,
});

export const activityMeta = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: `${vars.spacing['5']} ${vars.spacing['3']}`,
  textAlign: 'center',
  color: vars.text.muted,
  fontSize: vars.typography.size.sm,
});

// ── Badge styles (shared) ──────────────────────────────────────
