import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// ── Header ────────────────────────────────────────────────────────

export const avatar = style({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: vars.colors.gradientPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.background.surface,
  fontSize: '1.25rem',
  flexShrink: 0,
});

export const headerInfo = style({
  flex: 1,
  minWidth: 0,
});

export const headerName = style({
  margin: 0,
  fontSize: '1.125rem',
  fontWeight: '600',
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const headerSubtitle = style({
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const detailLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  fontSize: '0.6875rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.muted,
});

export const detailValue = style({
  fontSize: '0.875rem',
  color: vars.text.primary,
  fontWeight: '500',
});

export const emptyValue = style({
  color: vars.text.muted,
  fontStyle: 'italic',
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
  fontSize: '0.75rem',
  color: vars.text.muted,
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: vars.text.muted,
  fontSize: '0.875rem',
});

// ── Badge styles ──────────────────────────────────────────────────

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '600',
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '600',
  background: vars.colors.warningBgSubtle,
  color: vars.colors.warningTextEmphasis,
});

export const badgeInfo = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '600',
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});

export const badgeNeutral = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '600',
  background: vars.background.muted,
  color: vars.text.secondary,
});
