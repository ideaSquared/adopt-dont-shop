import { style } from '@vanilla-extract/css';

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '1rem',
});

export const card = style({
  position: 'relative',
  background: 'white',
  borderRadius: '16px',
  overflow: 'hidden',
  maxWidth: '24rem',
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
});

export const close = style({
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  background: 'rgba(0,0,0,0.45)',
  color: 'white',
  border: 'none',
  borderRadius: '999px',
  width: '2rem',
  height: '2rem',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
  zIndex: 1,
});

export const image = style({
  width: '100%',
  height: '14rem',
  objectFit: 'cover',
});

export const body = style({
  padding: '1.25rem 1.5rem 1.5rem',
  textAlign: 'center',
});

export const title = style({
  fontSize: '1.75rem',
  fontWeight: 800,
  margin: '0 0 0.5rem 0',
  background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

export const subtitle = style({
  fontSize: '1rem',
  color: '#333',
  margin: '0 0 1.25rem 0',
});

export const cta = style({
  display: 'inline-block',
  padding: '0.75rem 1.5rem',
  background: '#f5576c',
  color: 'white',
  borderRadius: '999px',
  fontWeight: 700,
  textDecoration: 'none',
  ':hover': { background: '#dc2626' },
});
