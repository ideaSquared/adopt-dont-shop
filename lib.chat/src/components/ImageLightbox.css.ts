import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
  from: { opacity: '0' },
  to: { opacity: '1' },
});

export const lightboxOverlay = style({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  background: 'rgba(0, 0, 0, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '1000',
  animationName: fadeIn,
  animationDuration: '0.2s',
  animationTimingFunction: 'ease-out',
});

export const lightboxContainer = style({
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

export const lightboxImage = style({
  maxWidth: '100%',
  maxHeight: '85vh',
  objectFit: 'contain',
  borderRadius: '8px',
  transition: 'transform 0.2s ease',
  selectors: {
    '&:active': {
      cursor: 'grabbing',
    },
  },
});

export const lightboxControls = style({
  position: 'absolute',
  top: '20px',
  right: '20px',
  display: 'flex',
  gap: '10px',
});

export const lightboxButton = style({
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  backdropFilter: 'blur(10px)',
  selectors: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
});

export const imageInfo = style({
  marginTop: '15px',
  color: 'white',
  textAlign: 'center',
  background: 'rgba(0, 0, 0, 0.5)',
  padding: '8px 16px',
  borderRadius: '20px',
  backdropFilter: 'blur(10px)',
});

export const navigationButton = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '50px',
  height: '50px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  backdropFilter: 'blur(10px)',
  selectors: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
});

export const navigationButtonPrev = style({
  left: '20px',
});

export const navigationButtonNext = style({
  right: '20px',
});
