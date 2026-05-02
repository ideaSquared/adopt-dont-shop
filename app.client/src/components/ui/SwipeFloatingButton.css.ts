import { keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const bounce = keyframes({
  '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
  '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
  '70%': { transform: 'translate3d(0, -4px, 0)' },
  '90%': { transform: 'translate3d(0, -2px, 0)' },
});

export const pulse = keyframes({
  '0%': { boxShadow: '0 0 0 0 rgba(255, 64, 129, 0.7)' },
  '70%': { boxShadow: '0 0 0 20px rgba(255, 64, 129, 0)' },
  '100%': { boxShadow: '0 0 0 0 rgba(255, 64, 129, 0)' },
});

export const slideUp = keyframes({
  from: { transform: 'translateY(100px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
});

export const floatingContainer = recipe({
  base: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    zIndex: 999,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1rem',
    animationName: slideUp,
    animationDuration: '0.5s',
    animationTimingFunction: 'ease-out',
    '@media': {
      '(max-width: 768px)': {
        display: 'none',
      },
    },
  },
  variants: {
    show: {
      true: {
        display: 'flex',
      },
      false: {
        display: 'none',
      },
    },
  },
  defaultVariants: { show: false },
});

export const calloutBubble = recipe({
  base: {
    background: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '20px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    maxWidth: '200px',
    animationName: slideUp,
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
    animationDelay: '0.2s',
    animationFillMode: 'both',
    '::after': {
      content: '""',
      position: 'absolute',
      bottom: '-8px',
      right: '2rem',
      width: 0,
      height: 0,
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid white',
    },
    selectors: {
      '& h4': {
        fontSize: '0.875rem',
        fontWeight: 600,
        margin: '0 0 0.5rem 0',
        color: '#333',
      },
      '& p': {
        fontSize: '0.75rem',
        margin: 0,
        color: '#666',
        lineHeight: 1.4,
      },
    },
    '@media': {
      '(max-width: 768px)': {
        maxWidth: '160px',
        padding: '0.875rem 1.25rem',
      },
    },
  },
  variants: {
    show: {
      true: {
        display: 'block',
      },
      false: {
        display: 'none',
      },
    },
  },
  defaultVariants: { show: false },
});

export const closeButton = style({
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  background: 'none',
  border: 'none',
  color: '#999',
  cursor: 'pointer',
  padding: 0,
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  ':hover': {
    color: '#666',
  },
});

export const floatingButton = style({
  width: '60px',
  height: '60px',
  background: 'linear-gradient(45deg, #ff4081, #ff6ec7)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  textDecoration: 'none',
  boxShadow: '0 8px 25px rgba(255, 64, 129, 0.3)',
  transition: 'all 0.3s ease',
  animationName: `${pulse}, ${bounce}`,
  animationDuration: '2s, 3s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDelay: '0s, 1s',
  ':hover': {
    transform: 'scale(1.1)',
    boxShadow: '0 12px 35px rgba(255, 64, 129, 0.4)',
  },
  selectors: {
    '& .icon': {
      fontSize: '1.5rem',
    },
  },
  '@media': {
    '(max-width: 768px)': {
      width: '56px',
      height: '56px',
      selectors: {
        '& .icon': {
          fontSize: '1.375rem',
        },
      },
    },
  },
});
