import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../lib.components/src/styles/theme.css';

export const container = style({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing.xl,
  background: `linear-gradient(135deg, ${vars.background.primary} 0%, ${vars.background.tertiary} 100%)`,
});

export const authCard = style({
  width: '100%',
  maxWidth: '500px',
  padding: vars.spacing.xl,
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
});

export const header = style({
  textAlign: 'center',
  marginBottom: vars.spacing.xl,
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
  fontWeight: 600,
});

globalStyle(`${header} p`, {
  color: vars.text.secondary,
  margin: '0',
  fontSize: '0.95rem',
});
