import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const headerLeft = style({});

globalStyle(`${headerLeft} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerLeft} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const filterBar = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  padding: '1.5rem',
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minWidth: '160px',
  flex: 1,
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.secondary,
});

export const select = style({
  padding: '0.625rem 1rem',
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  background: vars.background.surface,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: vars.text.muted,
  },
  ':focus-visible': {
    outline: 'none',
    borderColor: vars.colors.info,
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const searchWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '250px',
});

export const searchIcon = style({
  position: 'absolute',
  left: '1rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: vars.text.muted,
  pointerEvents: 'none',
});

export const searchInputPadded = style({
  paddingLeft: '2.75rem',
  width: '100%',
});

// Source badges
export const sourceBadgeModeration = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerHover,
});

export const sourceBadgeSupport = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});

export const sourceBadgeMessage = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#ede9fe',
  color: '#6b21a8',
});

// Status badges
export const badgeSuccess = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.successBgSubtle,
  color: vars.colors.successActive,
});

export const badgeDanger = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerHover,
});

export const badgeInfo = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});

export const badgeWarning = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.warningBgSubtle,
  color: vars.colors.warningTextEmphasis,
});

export const badgeNeutral = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.background.muted,
  color: vars.text.tertiary,
});

// Severity indicators
export const severityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
});

export const severityCritical = style([severityDot, { background: vars.colors.dangerHover }]);
export const severityHigh = style([severityDot, { background: '#ea580c' }]);
export const severityMedium = style([severityDot, { background: '#ca8a04' }]);
export const severityLow = style([severityDot, { background: vars.colors.infoHover }]);

export const severityLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: vars.text.secondary,
});

// Item content
export const itemTitle = style({
  fontWeight: 600,
  marginBottom: '0.25rem',
});

export const itemTitleUnassigned = style([itemTitle, { fontWeight: 700 }]);

export const itemSummary = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '350px',
});

export const itemMeta = style({
  fontSize: '0.75rem',
  color: vars.text.muted,
  marginTop: '0.25rem',
});

export const timestamp = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});

// Assign button
export const assignButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  border: `1px solid ${vars.border.color.default}`,
  background: vars.background.surface,
  color: vars.text.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.infoBgSubtle,
    borderColor: vars.colors.info,
    color: vars.colors.infoTextEmphasis,
  },
});

export const errorBanner = style({
  padding: '2rem',
  textAlign: 'center',
  color: vars.colors.dangerHover,
});
