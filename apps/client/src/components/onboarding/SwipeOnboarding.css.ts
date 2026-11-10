import { globalStyle, keyframes, style } from '@vanilla-extract/css';

export const swipeDemo = keyframes({
  '0%': { transform: 'translateX(0) rotate(0deg)' },
  '25%': { transform: 'translateX(15px) rotate(5deg)' },
  '50%': { transform: 'translateX(-15px) rotate(-5deg)' },
  '75%': { transform: 'translateX(10px) rotate(3deg)' },
  '100%': { transform: 'translateX(0) rotate(0deg)' },
});

export const modalContent = style({
  textAlign: 'center',
});

export const iconContainer = style({
  marginBottom: '1.5rem',
});

export const swipeIcon = style({
  display: 'inline-block',
  fontSize: '4rem',
  color: '#ff4081',
  animationName: swipeDemo,
  animationDuration: '3s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const subtitle = style({
  fontSize: '1.1rem',
  color: '#666',
  marginBottom: '2rem',
  lineHeight: 1.5,
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1rem',
    },
  },
});

export const features = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1rem',
  marginBottom: '2rem',
  textAlign: 'left',
});

export const feature = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.75rem',
  background: '#f8f9fa',
  borderRadius: '12px',
});

globalStyle(`${feature} .icon`, {
  fontSize: '1.5rem',
  color: '#ff4081',
  flexShrink: 0,
});

globalStyle(`${feature} .content`, {
  flex: 1,
});

globalStyle(`${feature} .title`, {
  fontWeight: 600,
  color: '#333',
  margin: '0 0 0.25rem 0',
  fontSize: '0.9rem',
});

globalStyle(`${feature} .desc`, {
  color: '#666',
  margin: 0,
  fontSize: '0.8rem',
  lineHeight: 1.3,
});

export const buttonContainer = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const primaryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'linear-gradient(45deg, #ff4081, #ff6ec7)',
  color: 'white',
  padding: '1rem 2rem',
  borderRadius: '50px',
  textDecoration: 'none',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(255, 64, 129, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(255, 64, 129, 0.4)',
  },
  '@media': {
    '(max-width: 768px)': {
      justifyContent: 'center',
    },
  },
});
