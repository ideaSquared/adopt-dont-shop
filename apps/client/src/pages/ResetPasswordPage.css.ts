import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const passwordRequirements = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  padding: '1rem',
  marginTop: '0.5rem',
});

globalStyle(`${passwordRequirements} h4`, {
  fontSize: '0.9rem',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${passwordRequirements} ul`, {
  margin: '0',
  paddingLeft: '1.5rem',
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
  marginTop: '1rem',
  display: 'block',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const styledAlert = style({
  marginBottom: '1.5rem',
});

export const successContainer = style({
  textAlign: 'center',
});

globalStyle(`${successContainer} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
  marginBottom: '1.5rem',
});

globalStyle(`${successContainer} .redirect-message`, {
  fontSize: '0.9rem',
  color: vars.text.muted,
  fontStyle: 'italic',
});

export const fullWidthTopGap = style({
  marginTop: '1rem',
});
