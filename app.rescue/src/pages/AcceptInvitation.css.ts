import { globalStyle, style, keyframes } from '@vanilla-extract/css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const pageContainer = style({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
});

export const card = style({
  background: 'white',
  borderRadius: '16px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  maxWidth: '500px',
  width: '100%',
  overflow: 'hidden',
});

export const cardHeader = style({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '2rem',
  textAlign: 'center',
});

globalStyle(`${cardHeader} h1`, {
  margin: '0 0 0.5rem 0',
  fontSize: '1.75rem',
  fontWeight: 700,
});

globalStyle(`${cardHeader} p`, {
  margin: 0,
  opacity: 0.9,
  fontSize: '0.95rem',
});

export const cardBody = style({
  padding: '2rem',
});

export const invitationInfo = style({
  background: '#f8f9fa',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
  borderLeft: '4px solid #667eea',
});

globalStyle(`${invitationInfo} p`, {
  margin: 0,
  color: '#666',
  fontSize: '0.9rem',
});

globalStyle(`${invitationInfo} p strong`, {
  color: '#333',
  display: 'block',
  marginBottom: '0.25rem',
});

export const formGroup = style({
  marginBottom: '1.25rem',
});

export const formLabel = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 600,
  color: '#333',
  fontSize: '0.9rem',
});

export const requiredIndicator = style({
  color: '#dc3545',
});

export const formInput = style({
  width: '100%',
  padding: '0.75rem 1rem',
  border: '2px solid #e9ecef',
  borderRadius: '8px',
  fontSize: '1rem',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: '#667eea',
    },
    '&:disabled': {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
    },
  },
});

export const formInputError = style({
  borderColor: '#dc3545',
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: '#dc3545',
    },
  },
});

export const formError = style({
  display: 'block',
  color: '#dc3545',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});

export const submitButton = style({
  width: '100%',
  padding: '0.875rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  marginTop: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  selectors: {
    '&:hover:not(:disabled)': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});

export const loadingSpinner = style({
  width: '1rem',
  height: '1rem',
  border: '2px solid transparent',
  borderTop: '2px solid white',
  borderRadius: '50%',
  animationName: spin,
  animationDuration: '1s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
});

export const errorContainer = style({
  background: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
  color: '#856404',
});

globalStyle(`${errorContainer} h3`, {
  margin: '0 0 0.5rem 0',
  fontSize: '1rem',
  fontWeight: 600,
});

globalStyle(`${errorContainer} p`, {
  margin: 0,
  fontSize: '0.9rem',
});

export const successContainer = style({
  textAlign: 'center',
  padding: '2rem',
});

globalStyle(`${successContainer} h2`, {
  color: '#28a745',
  margin: '0 0 1rem 0',
  fontSize: '1.5rem',
});

globalStyle(`${successContainer} p`, {
  color: '#666',
  margin: '0 0 1.5rem 0',
});

export const successIcon = style({
  fontSize: '4rem',
  marginBottom: '1rem',
});

export const loginButton = style({
  padding: '0.875rem 2rem',
  background: '#667eea',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#5568d3',
    },
  },
});

export const loginButtonFull = style({
  width: '100%',
});

export const passwordHint = style({
  display: 'block',
  color: '#666',
  fontSize: '0.8rem',
  marginTop: '0.25rem',
});

export const loadingContainer = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: '#666',
});
