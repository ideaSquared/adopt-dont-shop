import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const spinAnimation = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

export const cardContainer = recipe({
  base: {
    position: 'absolute',
    width: '100%',
    maxWidth: '350px',
    height: '600px',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    userSelect: 'none',
    overflow: 'hidden',
    willChange: 'transform',
    selectors: {
      '&:active': {
        // cursor handled inline based on isTop prop
      },
    },
    '@media': {
      '(max-width: 768px)': {
        maxWidth: '90vw',
        height: '70vh',
      },
    },
  },
  variants: {
    isTop: {
      true: {
        cursor: 'grab',
      },
      false: {
        cursor: 'default',
      },
    },
    disabled: {
      true: {
        cursor: 'default',
      },
      false: {},
    },
  },
  defaultVariants: { isTop: false, disabled: false },
});

export const imageContainer = style({
  position: 'relative',
  height: '70%',
  overflow: 'hidden',
});

globalStyle(`${imageContainer} img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  color: 'white',
  textAlign: 'center',
});

globalStyle(`${placeholderImage} .placeholder-icon`, {
  fontSize: '80px',
  marginBottom: '20px',
});

export const placeholderIconSpin = style({
  fontSize: '80px',
  marginBottom: '20px',
  animationName: spinAnimation,
  animationDuration: '2s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
});

export const placeholderText = style({
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '8px',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
});

export const placeholderSubtext = style({
  fontSize: '1rem',
  opacity: 0.9,
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
});

export const swipeOverlay = style({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  color: 'white',
  fontWeight: 'bold',
  border: '4px solid white',
  zIndex: 10,
});

export const cardContent = style({
  padding: '20px',
  height: '30%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
});

export const petName = style({
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 8px 0',
  color: '#333',
});

export const petDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const detailRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '16px',
  color: '#666',
});

export const badge = recipe({
  base: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  variants: {
    variant: {
      age: {
        background: '#e3f2fd',
        color: '#1976d2',
      },
      size: {
        background: '#f3e5f5',
        color: '#7b1fa2',
      },
      breed: {
        background: '#e8f5e8',
        color: '#388e3c',
      },
    },
  },
  defaultVariants: { variant: 'age' },
});

export const loginPromptOverlay = recipe({
  base: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: '20px',
    textAlign: 'center',
    padding: '2rem',
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

export const promptIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
  color: '#4ecdc4',
});

export const promptTitle = style({
  color: 'white',
  fontSize: '1.2rem',
  marginBottom: '0.5rem',
  fontWeight: 600,
});

export const promptText = style({
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '0.9rem',
  lineHeight: 1.4,
  marginBottom: '1.5rem',
});

export const promptButton = style({
  background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
  color: 'white',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(78, 205, 196, 0.4)',
  },
});
