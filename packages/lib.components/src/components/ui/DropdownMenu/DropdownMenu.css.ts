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
  selectors: {
    '&:hover': { color: vars.text.linkHover },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const content = style({
  backgroundColor: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: `${vars.spacing['1']} 0`,
  minWidth: '150px',
  zIndex: vars.zIndex.dropdown,
  boxShadow: vars.shadows.base,
});

export const item = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  color: vars.text.primary,
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'block',
  transition: `all ${vars.transitions.fast}`,
  selectors: {
    '&:hover': { backgroundColor: vars.background.muted, outline: 'none' },
    '&:focus': { backgroundColor: vars.background.muted, outline: 'none' },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '-2px',
    },
  },
});
