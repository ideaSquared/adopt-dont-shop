import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const root = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: `${vars.spacing['3']} ${vars.spacing['4']}`,
});

export const text = style({
  flex: '1 1 16rem',
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontFamily: vars.typography.family.sans,
  fontSize: vars.typography.size['3xl'],
  fontWeight: vars.typography.weight.bold,
  lineHeight: vars.typography.lineHeight.tight,
  color: vars.text.primary,
  overflowWrap: 'anywhere',
});

export const description = style({
  margin: `${vars.spacing['2']} 0 0`,
  fontSize: vars.typography.size.base,
  color: vars.text.secondary,
});

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.spacing['2'],
});
