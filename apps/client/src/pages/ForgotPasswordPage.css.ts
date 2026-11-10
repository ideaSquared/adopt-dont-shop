import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
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

globalStyle(`${successContainer} .email-highlight`, {
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
});

export const infoBox = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginTop: vars.spacing['3'],
});

globalStyle(`${infoBox} p`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  margin: '0',
  lineHeight: '1.5',
});

globalStyle(`${infoBox} strong`, {
  color: vars.text.primary,
});
