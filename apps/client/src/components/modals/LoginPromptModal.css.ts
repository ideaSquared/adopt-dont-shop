import { style } from '@vanilla-extract/css';

export const content = style({
  textAlign: 'center',
});

export const icon = style({
  fontSize: '4rem',
  marginBottom: '1.5rem',
  color: '#4ecdc4',
});

export const message = style({
  fontSize: '1rem',
  color: '#666',
  lineHeight: 1.6,
  marginBottom: '2rem',
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const primaryButton = style({
  background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
  color: 'white',
  padding: '1rem 2rem',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(78, 205, 196, 0.4)',
  },
});

export const secondaryButton = style({
  background: 'transparent',
  color: '#4ecdc4',
  padding: '1rem 2rem',
  border: '2px solid #4ecdc4',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  transition: 'all 0.3s ease',
  ':hover': {
    background: '#4ecdc4',
    color: 'white',
    transform: 'translateY(-2px)',
  },
});
