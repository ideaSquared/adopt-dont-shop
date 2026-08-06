import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  width: '100%',
});

export const searchRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
});

export const searchField = style({
  flex: '1 1 240px',
  minWidth: 0,
});

export const resultSummary = style({
  margin: 0,
  flexShrink: 0,
  fontSize: vars.typography.size.sm,
  color: vars.text.muted,
});

export const chipList = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  paddingLeft: vars.spacing['3'],
  paddingRight: vars.spacing['1'],
  paddingTop: vars.spacing['1'],
  paddingBottom: vars.spacing['1'],
  backgroundColor: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryTextEmphasis,
  border: `${vars.border.width.thin} solid ${vars.colors.primaryBorderSubtle}`,
  borderRadius: vars.border.radius.pill,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  lineHeight: vars.typography.lineHeight.none,
});

export const chipRemove = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '18px',
  height: '18px',
  padding: 0,
  border: 'none',
  borderRadius: vars.border.radius.pill,
  backgroundColor: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  transition: `background-color ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.primaryBorderSubtle,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '1px',
    },
  },
});

globalStyle(`${chipRemove} svg`, {
  width: '12px',
  height: '12px',
});
