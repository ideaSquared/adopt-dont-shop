import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const slideIn = keyframes({
  from: { transform: 'translateY(50px)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
});

export const swipeDemo = keyframes({
  '0%': { transform: 'translateX(0) rotate(0deg)' },
  '25%': { transform: 'translateX(15px) rotate(5deg)' },
  '50%': { transform: 'translateX(-15px) rotate(-5deg)' },
  '75%': { transform: 'translateX(10px) rotate(3deg)' },
  '100%': { transform: 'translateX(0) rotate(0deg)' },
});

export const overlay = recipe({
  base: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    animationName: fadeIn,
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
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

export const modalContent = style({
  background: 'white',
  borderRadius: '24px',
  padding: '2.5rem',
  maxWidth: '500px',
  width: '100%',
  textAlign: 'center',
  position: 'relative',
  animationName: slideIn,
  animationDuration: '0.4s',
  animationTimingFunction: 'ease-out',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  '@media': {
    '(max-width: 768px)': {
      padding: '2rem',
      margin: '1rem',
    },
  },
});

export const closeButton = style({
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'none',
  border: 'none',
  color: '#999',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '50%',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f5f5f5',
    color: '#666',
  },
});

globalStyle(`${closeButton} svg`, {
  width: '24px',
  height: '24px',
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
});

export const title = style({
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '1rem',
  color: '#333',
  lineHeight: 1.2,
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1.75rem',
    },
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

export const secondaryButton = style({
  background: 'none',
  border: '2px solid #e9ecef',
  color: '#666',
  padding: '1rem 2rem',
  borderRadius: '50px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  ':hover': {
    borderColor: '#dee2e6',
    background: '#f8f9fa',
  },
  '@media': {
    '(max-width: 768px)': {
      width: '100%',
    },
  },
});
