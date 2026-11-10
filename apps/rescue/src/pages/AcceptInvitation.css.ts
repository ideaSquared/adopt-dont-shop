import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  minHeight: '100vh',
  background: vars.colors.gradientPrimary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
});

export const card = style({
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  maxWidth: '500px',
  width: '100%',
  overflow: 'hidden',
});

export const cardHeader = style({
  background: vars.colors.gradientPrimary,
  color: 'white',
  padding: '2rem',
  textAlign: 'center',
});

globalStyle(`${cardHeader} h1`, {
  margin: '0 0 0.5rem 0',
  fontSize: '1.75rem',
  fontWeight: 700,
});

globalStyle(`${cardHeader} p`, {
  margin: 0,
  opacity: 0.9,
  fontSize: '0.95rem',
});

export const cardBody = style({
  padding: '2rem',
});

export const invitationInfo = style({
  background: '#f8f9fa',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
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
  marginBottom: '0.25rem',
});

export const successContainer = style({
  textAlign: 'center',
  padding: '2rem',
});

globalStyle(`${successContainer} h2`, {
  color: '#28a745',
  margin: '0 0 1rem 0',
  fontSize: '1.5rem',
});

globalStyle(`${successContainer} p`, {
  color: '#666',
  margin: '0 0 1.5rem 0',
});

export const successIcon = style({
  fontSize: '4rem',
  marginBottom: '1rem',
});

export const loadingContainer = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: '#666',
});
