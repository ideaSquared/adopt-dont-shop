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

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
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
  minWidth: '200px',
  flex: 1,
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.secondary,
});

export const searchInputWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '300px',
});

globalStyle(`${searchInputWrapper} svg`, {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: vars.text.muted,
  fontSize: '1.125rem',
});

globalStyle(`${searchInputWrapper} input`, {
  paddingLeft: '2.5rem',
});

export const select = style({
  padding: '0.625rem 0.875rem',
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
    borderColor: vars.colors.primary,
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.warningBgSubtle,
  color: vars.colors.warningTextEmphasis,
});

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
});

export const badgeNeutral = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.background.muted,
  color: vars.text.secondary,
});

export const rescueInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const rescueName = style({
  fontWeight: '600',
  color: vars.text.primary,
});

export const rescueDetail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
});

globalStyle(`${rescueDetail} svg`, {
  fontSize: '0.875rem',
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const iconButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '6px',
  background: vars.background.surface,
  color: vars.text.tertiary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.body,
    color: vars.text.primary,
    borderColor: vars.border.color.muted,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const errorMessage = style({
  background: vars.colors.dangerBgSubtle,
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  borderRadius: '8px',
  padding: '1rem',
  color: vars.colors.dangerTextEmphasis,
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${errorMessage} svg`, {
  flexShrink: 0,
});

export const approveButton = style({
  color: '#10b981',
  borderColor: '#10b981',
});

export const rejectButton = style({
  color: '#ef4444',
  borderColor: '#ef4444',
});

// Split-pane layout is shared across the entity-management pages.
export {
  splitLayout,
  listPane,
  listPaneNarrow,
  detailPane,
  backToList,
} from '../components/detail/splitPane.css';
