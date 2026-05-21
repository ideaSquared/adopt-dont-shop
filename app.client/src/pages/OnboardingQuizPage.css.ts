import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: `linear-gradient(135deg, ${vars.background.surface} 0%, ${vars.background.body} 100%)`,
});

export const card = style({
  width: '100%',
  maxWidth: '640px',
  padding: '2.5rem',
});

export const header = style({
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
  fontSize: '1rem',
});

export const question = style({
  marginBottom: '1.5rem',
});

globalStyle(`${question} h3`, {
  fontSize: '1.125rem',
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

export const choices = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const choiceLabel = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '0.95rem',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1rem',
  marginTop: '2rem',
});

export const warning = style({
  marginTop: '1rem',
});
