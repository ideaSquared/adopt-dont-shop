import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
  from: { opacity: '0' },
  to: { opacity: '1' },
});

export const pdfOverlay = style({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  background: 'rgba(0, 0, 0, 0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '1000',
  animationName: fadeIn,
  animationDuration: '0.2s',
  animationTimingFunction: 'ease-out',
});

export const pdfContainer = style({
  position: 'relative',
  width: '90vw',
  height: '90vh',
  maxWidth: '1000px',
  background: 'white',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
});

export const pdfHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: '#f8f9fa',
  borderBottom: '1px solid #e9ecef',
  flexShrink: '0',
});

export const pdfTitle = style({
  margin: '0',
  fontSize: '1rem',
  fontWeight: '500',
  color: '#212529',
  flex: '1',
});

export const pdfControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const pdfButtonDefault = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: '#6c757d',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#e9ecef',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
});

export const pdfButtonPrimary = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  border: 'none',
  background: '#007bff',
  color: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#0056b3',
    },
    '&:disabled': {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
});

export const pdfContent = style({
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background: '#f8f9fa',
  overflow: 'hidden',
});

export const pdfEmbed = style({
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: '8px',
  transformOrigin: 'center',
  transition: 'transform 0.2s ease',
});

export const pdfIframe = style({
  width: '100%',
  height: '100%',
  border: 'none',
  borderRadius: '8px',
  transformOrigin: 'center',
  transition: 'transform 0.2s ease',
});

export const pdfError = style({
  textAlign: 'center',
  color: '#6c757d',
});

export const downloadLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  background: '#007bff',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '6px',
  fontSize: '0.875rem',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#0056b3',
    },
  },
});
