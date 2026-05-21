import { style } from '@vanilla-extract/css';

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: '1rem',
});

export const card = style({
  position: 'relative',
  background: 'white',
  borderRadius: '16px',
  padding: '2rem 1.5rem',
  maxWidth: '24rem',
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
});

export const dismiss = style({
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  background: 'transparent',
  color: '#6c757d',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
});

export const title = style({
  fontSize: '1.75rem',
  fontWeight: 800,
  margin: '0 0 0.5rem 0',
  color: '#333',
});

export const subtitle = style({
  fontSize: '1rem',
  color: '#6c757d',
  margin: '0 0 1.5rem 0',
});

export const actions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const ctaPrimary = style({
  padding: '0.75rem 1.5rem',
  background: '#4ecdc4',
  color: 'white',
  borderRadius: '999px',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  ':hover': { background: '#45b7b8' },
});

export const ctaSecondary = style({
  padding: '0.75rem 1.5rem',
  background: 'transparent',
  color: '#4ecdc4',
  border: '2px solid #4ecdc4',
  borderRadius: '999px',
  fontWeight: 700,
  cursor: 'pointer',
  ':hover': { background: '#e9f7f6' },
});
