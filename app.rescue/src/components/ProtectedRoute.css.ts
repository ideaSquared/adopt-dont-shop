import { style, keyframes } from '@vanilla-extract/css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const loadingContainer = style({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
});

export const loadingCard = style({
  padding: '3rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
});

export const loadingSpinner = style({
  width: '40px',
  height: '40px',
  border: '4px solid #f3f4f6',
  borderTopColor: '#667eea',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});
