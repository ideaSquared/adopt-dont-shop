import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const trigger = style({
  color: vars.text.primary,
  fontWeight: vars.typography.weight.bold,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { color: vars.text.linkHover },
    '&:focus-visible': {
      outline: `${vars.border.width.normal} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const content = style({
  backgroundColor: vars.background.secondary,
  border: `${vars.border.width.thin} solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  padding: `${vars.spacing.xs} 0`,
  minWidth: '150px',
  zIndex: vars.zIndex.dropdown,
  boxShadow: vars.shadows.md,
});

export const item = style({
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  color: vars.text.primary,
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'block',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { backgroundColor: vars.background.tertiary, outline: 'none' },
    '&:focus': { backgroundColor: vars.background.tertiary, outline: 'none' },
    '&:focus-visible': {
      outline: `${vars.border.width.normal} solid ${vars.border.color.focus}`,
      outlineOffset: '-2px',
    },
  },
});
