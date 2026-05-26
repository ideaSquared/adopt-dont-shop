import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  overflow: 'hidden',
});

export const panelHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem 1.25rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const avatar = style({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: vars.colors.gradientPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.background.surface,
  fontWeight: '600',
  fontSize: '1.125rem',
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

export const closeButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  color: vars.text.tertiary,
  cursor: 'pointer',
  flexShrink: 0,
  ':hover': {
    background: vars.background.muted,
    color: vars.text.primary,
  },
});

export const tabBar = style({
  display: 'flex',
  gap: 0,
  borderBottom: `1px solid ${vars.border.color.default}`,
  padding: '0 1.25rem',
});

export const tab = style({
  padding: '0.625rem 1rem',
  border: 'none',
  borderBottom: '2px solid transparent',
  background: 'transparent',
  color: vars.text.tertiary,
  fontSize: '0.8125rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    color: vars.text.primary,
  },
});

export const tabActive = style({
  color: vars.colors.primary,
  borderBottomColor: vars.colors.primary,
});

export const tabContent = style({
  flex: 1,
  overflowY: 'auto',
  padding: '1.25rem',
});

// ── Overview tab ──────────────────────────────────────────────────

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
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

// ── Edit tab ──────────────────────────────────────────────────────

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const formLabel = style({
  fontSize: '0.8125rem',
  fontWeight: '600',
  color: vars.text.secondary,
});

export const formSelect = style({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  background: vars.background.surface,
  cursor: 'pointer',
  ':focus-visible': {
    outline: 'none',
    borderColor: vars.colors.primary,
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
});

export const formActions = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  paddingTop: '0.75rem',
  borderTop: `1px solid ${vars.border.color.default}`,
});

export const formError = style({
  padding: '0.5rem 0.75rem',
  background: vars.colors.dangerBgSubtle,
  border: `1px solid ${vars.colors.dangerBgSubtle}`,
  borderRadius: '8px',
  color: vars.colors.dangerTextEmphasis,
  fontSize: '0.8125rem',
});

// ── Actions tab ──────────────────────────────────────────────────

export const actionsSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const actionGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const actionGroupLabel = style({
  fontSize: '0.6875rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.muted,
});

export const actionButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.625rem 0.875rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  background: vars.background.surface,
  color: vars.text.primary,
  fontSize: '0.8125rem',
  fontWeight: '500',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s ease',
  ':hover': {
    background: vars.background.muted,
    borderColor: vars.border.color.muted,
  },
});

export const actionButtonDanger = style({
  color: vars.colors.dangerTextEmphasis,
  ':hover': {
    background: vars.colors.dangerBgSubtle,
    borderColor: vars.colors.dangerBgSubtle,
  },
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

// ── Badge styles (shared) ──────────────────────────────────────

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

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.6875rem',
  fontWeight: '600',
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
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

// ── Admin notes tab ──────────────────────────────────────────────

export const notesPlaceholder = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: vars.text.muted,
  fontSize: '0.875rem',
});

globalStyle(`${notesPlaceholder} code`, {
  fontSize: '0.75rem',
  background: vars.background.muted,
  padding: '0.125rem 0.375rem',
  borderRadius: '4px',
});
