import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const trigger = style({
  background: 'transparent',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: vars.text.primary,
  fontWeight: vars.typography.weight.bold,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
  selectors: {
    '&:hover': { color: vars.text.linkHover },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: vars.spacing['1'],
    },
  },
});

export const content = style({
  backgroundColor: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: `${vars.spacing['1']} 0`,
  minWidth: '12rem',
  zIndex: vars.zIndex.dropdown,
  boxShadow: vars.shadows.base,
});

export const item = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  color: vars.text.primary,
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  transition: `all ${vars.transitions.fast}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
  selectors: {
    '&[data-highlighted]': { backgroundColor: vars.background.muted, outline: 'none' },
    '&:hover': { backgroundColor: vars.background.muted, outline: 'none' },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: `-${vars.border.width.base}`,
    },
    '&[data-disabled]': { color: vars.text.disabled, cursor: 'not-allowed' },
  },
});

export const itemDanger = style({
  color: vars.text.danger,
});

export const itemIcon = style({
  display: 'inline-flex',
  flexShrink: 0,
});

export const itemText = style({
  display: 'flex',
  flexDirection: 'column',
});

export const itemDescription = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
});

export const separator = style({
  height: vars.border.width.thin,
  margin: `${vars.spacing['1']} 0`,
  backgroundColor: vars.border.color.muted,
});

export const header = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  borderBottom: `${vars.border.width.thin} solid ${vars.border.color.muted}`,
  marginBottom: vars.spacing['1'],
});
