import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  minHeight: '100vh',
  background: vars.colors.gradientPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing['5'],
});

export const card = style({
  background: 'white',
  borderRadius: vars.border.radius.xl,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  maxWidth: '500px',
  width: '100%',
  overflow: 'hidden',
});

export const cardHeader = style({
  background: vars.colors.gradientPrimary,
  color: 'white',
  padding: vars.spacing['5'],
  textAlign: 'center',
});

globalStyle(`${cardHeader} h1`, {
  margin: `0 0 ${vars.spacing['2']} 0`,
  fontSize: '1.75rem',
  fontWeight: vars.typography.weight.bold,
});

globalStyle(`${cardHeader} p`, {
  margin: 0,
  opacity: 0.9,
  fontSize: '0.95rem',
});

export const cardBody = style({
  padding: vars.spacing['5'],
});

export const invitationInfo = style({
  background: '#f8f9fa',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
  borderLeft: '4px solid #667eea',
});

globalStyle(`${invitationInfo} p`, {
  margin: 0,
  color: '#666',
  fontSize: '0.9rem',
});

globalStyle(`${invitationInfo} p strong`, {
  color: '#333',
  display: 'block',
  marginBottom: vars.spacing['1'],
});

export const successContainer = style({
  textAlign: 'center',
  padding: vars.spacing['5'],
});

globalStyle(`${successContainer} h2`, {
  color: '#28a745',
  margin: `0 0 ${vars.spacing['3']} 0`,
  fontSize: vars.typography.size['2xl'],
});

globalStyle(`${successContainer} p`, {
  color: '#666',
  margin: `0 0 ${vars.spacing['4']} 0`,
});

export const successIcon = style({
  fontSize: '4rem',
  marginBottom: vars.spacing['3'],
});

export const loadingContainer = style({
  textAlign: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['5']}`,
  color: '#666',
});
