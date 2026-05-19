import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const infoBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
  background: vars.colors.infoBgSubtle,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.colors.infoTextEmphasis,
  marginBottom: '1.5rem',
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

export const tabRow = style({
  display: 'flex',
  gap: 0,
  borderBottom: `2px solid ${vars.border.color.default}`,
  marginBottom: '1.5rem',
});

export const tab = style({
  padding: '0.75rem 1.5rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontWeight: '400',
  color: vars.text.tertiary,
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  textTransform: 'capitalize',
  transition: 'all 0.2s',
  ':hover': {
    color: vars.colors.infoHover,
  },
});

export const tabActive = style({
  fontWeight: '600',
  color: vars.colors.infoHover,
  borderBottomColor: vars.colors.infoHover,
});

export const roleSelector = style({
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '1.5rem',
});

export const roleChip = style({
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  border: `1px solid ${vars.border.color.muted}`,
  background: 'white',
  color: vars.text.secondary,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  textTransform: 'capitalize',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: vars.colors.infoHover,
  },
});

export const roleChipActive = style({
  border: `1px solid ${vars.colors.infoHover}`,
  background: vars.colors.infoHover,
  color: 'white',
});

export const fieldTable = style({
  width: '100%',
  borderCollapse: 'collapse',
});

export const tableHeader = style({
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: '600',
  fontSize: '0.8rem',
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const tableRow = style({
  background: 'transparent',
  ':hover': {
    background: vars.background.body,
  },
});

export const tableRowModified = style({
  background: vars.colors.warningBgSubtle,
  ':hover': {
    background: vars.colors.warningBgSubtle,
  },
});

export const tableCell = style({
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${vars.background.muted}`,
  fontSize: '0.875rem',
});

export const fieldName = style({
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontSize: '0.8rem',
  padding: '0.125rem 0.375rem',
  background: vars.background.muted,
  borderRadius: '4px',
});

export const accessSelectWrite = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.muted}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
});

export const accessSelectRead = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.muted}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});

export const accessSelectNone = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.muted}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
});

export const accessSelectDefault = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.muted}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: 'white',
  color: vars.text.secondary,
});

export const overrideBadge = style({
  fontSize: '0.7rem',
  padding: '0.125rem 0.5rem',
  background: vars.colors.warningBgSubtle,
  color: vars.colors.warningTextEmphasis,
  borderRadius: '10px',
  fontWeight: '600',
  marginLeft: '0.5rem',
});

export const statusBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  background: vars.background.body,
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.875rem',
});
