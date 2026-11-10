import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const loadingContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: vars.background.muted,
});

export const loadingText = style({
  marginTop: '1rem',
  color: vars.text.tertiary,
  fontSize: '0.875rem',
});

export const unauthorizedContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: vars.background.muted,
  padding: '2rem',
  textAlign: 'center',
});

export const unauthorizedCard = style({
  maxWidth: '500px',
});

export const unauthorizedIcon = style({
  fontSize: '4rem',
  marginBottom: '1.5rem',
  color: vars.text.tertiary,
});

export const unauthorizedMessage = style({
  display: 'block',
  margin: '0 0 2rem 0',
  lineHeight: '1.6',
});
