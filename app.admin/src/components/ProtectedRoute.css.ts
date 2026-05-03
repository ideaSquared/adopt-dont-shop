import { style, keyframes } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

const spin = keyframes({
  to: { transform: 'rotate(360deg)' },
});

export const loadingContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#f3f4f6',
});

export const loadingSpinner = style({
  width: '48px',
  height: '48px',
  border: '4px solid #e5e7eb',
  borderTopColor: vars.colors.primary['500'],
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});

export const loadingText = style({
  marginTop: '1rem',
  color: '#6b7280',
  fontSize: '0.875rem',
});

export const unauthorizedContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#f3f4f6',
  padding: '2rem',
  textAlign: 'center',
});

export const unauthorizedCard = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '3rem 2rem',
  maxWidth: '500px',
});

export const unauthorizedIcon = style({
  fontSize: '4rem',
  marginBottom: '1.5rem',
});

export const unauthorizedTitle = style({
  fontSize: '1.75rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 1rem 0',
});

export const unauthorizedMessage = style({
  fontSize: '1rem',
  color: '#6b7280',
  margin: '0 0 2rem 0',
  lineHeight: '1.6',
});

export const backButton = style({
  background: vars.colors.primary['600'],
  color: 'white',
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primary['700'],
  },
});
