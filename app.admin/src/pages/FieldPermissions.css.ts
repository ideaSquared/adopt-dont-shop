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
  background: vars.colors.semantic.info['50'],
  border: `1px solid ${vars.colors.semantic.info['200']}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.colors.semantic.info['800'],
  marginBottom: '1.5rem',
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

export const tabRow = style({
  display: 'flex',
  gap: 0,
  borderBottom: `2px solid ${vars.border.color.primary}`,
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
    color: vars.colors.semantic.info['600'],
  },
});

export const tabActive = style({
  fontWeight: '600',
  color: vars.colors.semantic.info['600'],
  borderBottomColor: vars.colors.semantic.info['600'],
});

export const roleSelector = style({
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '1.5rem',
});

export const roleChip = style({
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  border: `1px solid ${vars.border.color.secondary}`,
  background: 'white',
  color: vars.text.secondary,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: '500',
  textTransform: 'capitalize',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: vars.colors.semantic.info['600'],
  },
});

export const roleChipActive = style({
  border: `1px solid ${vars.colors.semantic.info['600']}`,
  background: vars.colors.semantic.info['600'],
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
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

export const tableRow = style({
  background: 'transparent',
  ':hover': {
    background: vars.background.primary,
  },
});

export const tableRowModified = style({
  background: vars.colors.semantic.warning['50'],
  ':hover': {
    background: vars.colors.semantic.warning['100'],
  },
});

export const tableCell = style({
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${vars.background.tertiary}`,
  fontSize: '0.875rem',
});

export const fieldName = style({
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontSize: '0.8rem',
  padding: '0.125rem 0.375rem',
  background: vars.background.tertiary,
  borderRadius: '4px',
});

export const accessSelectWrite = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.secondary}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.semantic.success['100'],
  color: vars.colors.semantic.success['800'],
});

export const accessSelectRead = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.secondary}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

export const accessSelectNone = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.secondary}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: vars.colors.semantic.error['100'],
  color: vars.colors.semantic.error['800'],
});

export const accessSelectDefault = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.secondary}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
  background: 'white',
  color: vars.text.secondary,
});

export const overrideBadge = style({
  fontSize: '0.7rem',
  padding: '0.125rem 0.5rem',
  background: vars.colors.semantic.warning['100'],
  color: vars.colors.semantic.warning['800'],
  borderRadius: '10px',
  fontWeight: '600',
  marginLeft: '0.5rem',
});

export const statusBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  background: vars.background.primary,
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.875rem',
});
