import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: `linear-gradient(135deg, ${vars.background.secondary} 0%, ${vars.background.primary} 100%)`,
});

export const resetPasswordCard = style({
  width: '100%',
  maxWidth: '450px',
  padding: '2rem',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '2rem',
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

globalStyle(`${header} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
});

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
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
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
  color: vars.colors.primary['500'],
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

globalStyle(`${successContainer} h2`, {
  fontSize: '1.5rem',
  color: '#059669',
  marginBottom: '1rem',
});

globalStyle(`${successContainer} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
  marginBottom: '1.5rem',
});

globalStyle(`${successContainer} .redirect-message`, {
  fontSize: '0.9rem',
  color: vars.text.quaternary,
  fontStyle: 'italic',
});

export const fullWidthTopGap = style({
  marginTop: '1rem',
});
