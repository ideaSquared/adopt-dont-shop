import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const iconContainer = style({
  textAlign: 'center',
  marginBottom: vars.spacing['4'],
  fontSize: '4rem',
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['5'],
});

export const loadingSpinner = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: vars.spacing['5'],
});

export const resendSection = style({
  textAlign: 'center',
  marginTop: vars.spacing['4'],
  paddingTop: vars.spacing['4'],
  borderTop: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${resendSection} p`, {
  color: vars.text.tertiary,
  marginBottom: vars.spacing['3'],
  fontSize: '0.95rem',
});

export const resendAlert = style({
  marginTop: vars.spacing['3'],
});
