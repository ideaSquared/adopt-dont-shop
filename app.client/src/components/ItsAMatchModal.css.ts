import { keyframes, style } from '@vanilla-extract/css';

// ADS-633: Tinder-inspired "It's a Match!" celebration. The animations are
// intentionally large — this is meant to be the dopamine peak of the flow.

const pulse = keyframes({
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.05)' },
  '100%': { transform: 'scale(1)' },
});

const slideUp = keyframes({
  from: { transform: 'translateY(40px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
});

export const celebration = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '1rem 0.5rem 0.5rem',
  animationName: slideUp,
  animationDuration: '0.4s',
  animationTimingFunction: 'ease-out',
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const headline = style({
  fontSize: '2.25rem',
  fontWeight: 800,
  margin: 0,
  background: 'linear-gradient(45deg, #ff6b6b, #ff8e53)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '-0.5px',
});

export const subhead = style({
  fontSize: '1rem',
  color: '#555',
  marginTop: '0.5rem',
  marginBottom: '1.5rem',
  lineHeight: 1.5,
});

export const photoFrame = style({
  width: '180px',
  height: '180px',
  borderRadius: '50%',
  overflow: 'hidden',
  border: '4px solid #ff6b6b',
  boxShadow: '0 10px 30px rgba(255, 107, 107, 0.35)',
  marginBottom: '1.25rem',
  animationName: pulse,
  animationDuration: '2s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const photo = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const photoPlaceholder = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
  color: 'white',
  fontSize: '4rem',
  fontWeight: 700,
});

export const petName = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#222',
  margin: 0,
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  width: '100%',
  marginTop: '1.5rem',
});

export const primaryButton = style({
  background: 'linear-gradient(45deg, #ff6b6b, #ff8e53)',
  color: 'white',
  padding: '1rem 1.5rem',
  borderRadius: '999px',
  border: 'none',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  boxShadow: '0 6px 20px rgba(255, 107, 107, 0.35)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(255, 107, 107, 0.45)',
  },
});

export const dismissButton = style({
  background: 'transparent',
  color: '#888',
  border: 'none',
  padding: '0.5rem',
  fontSize: '0.9rem',
  cursor: 'pointer',
  ':hover': {
    color: '#444',
  },
});
