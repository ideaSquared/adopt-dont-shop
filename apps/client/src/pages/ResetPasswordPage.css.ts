import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const passwordRequirements = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginTop: vars.spacing['2'],
});

globalStyle(`${passwordRequirements} h4`, {
  fontSize: '0.9rem',
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['2']} 0`,
});

globalStyle(`${passwordRequirements} ul`, {
  margin: '0',
  paddingLeft: vars.spacing['4'],
  listStyle: 'disc',
});

globalStyle(`${passwordRequirements} li`, {
  fontSize: '0.85rem',
  color: vars.text.tertiary,
  lineHeight: '1.5',
});

export const backToLoginLink = style({
  fontSize: '0.9rem',
  color: vars.colors.primary,
  textDecoration: 'none',
  textAlign: 'center',
  marginTop: vars.spacing['3'],
  display: 'block',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const styledAlert = style({
  marginBottom: vars.spacing['4'],
});

export const successContainer = style({
  textAlign: 'center',
});

globalStyle(`${successContainer} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
  marginBottom: vars.spacing['4'],
});

globalStyle(`${successContainer} .redirect-message`, {
  fontSize: '0.9rem',
  color: vars.text.muted,
  fontStyle: 'italic',
});

export const fullWidthTopGap = style({
  marginTop: vars.spacing['3'],
});
