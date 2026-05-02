import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const slideUp = keyframes({
  from: { transform: 'translateY(30px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
});

export const modalOverlay = recipe({
  base: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '1rem',
    transition: 'all 0.3s ease',
  },
  variants: {
    isOpen: {
      true: {
        opacity: 1,
        visibility: 'visible',
        animationName: fadeIn,
        animationDuration: '0.3s',
        animationTimingFunction: 'ease',
      },
      false: {
        opacity: 0,
        visibility: 'hidden',
      },
    },
  },
  defaultVariants: { isOpen: false },
});

export const modalContent = recipe({
  base: {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    '@media': {
      '(max-width: 768px)': {
        margin: '1rem',
        padding: '1.5rem',
      },
    },
  },
  variants: {
    isOpen: {
      true: {
        animationName: slideUp,
        animationDuration: '0.3s',
        animationTimingFunction: 'ease',
      },
      false: {},
    },
  },
  defaultVariants: { isOpen: false },
});

export const closeButton = style({
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#666',
  cursor: 'pointer',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f5f5f5',
    color: '#333',
  },
});

export const icon = style({
  fontSize: '4rem',
  marginBottom: '1.5rem',
  color: '#4ecdc4',
});

export const title = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#333',
  marginBottom: '1rem',
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

export const skipButton = style({
  background: 'none',
  border: 'none',
  color: '#999',
  fontSize: '0.9rem',
  cursor: 'pointer',
  padding: '0.5rem',
  transition: 'color 0.2s ease',
  ':hover': {
    color: '#666',
  },
});
