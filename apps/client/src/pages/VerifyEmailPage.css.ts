import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const iconContainer = style({
  textAlign: 'center',
  marginBottom: '1.5rem',
  fontSize: '4rem',
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginTop: '2rem',
});

export const loadingSpinner = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem',
});

export const resendSection = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${resendSection} p`, {
  color: vars.text.tertiary,
  marginBottom: '1rem',
  fontSize: '0.95rem',
});

export const resendAlert = style({
  marginTop: '1rem',
});
