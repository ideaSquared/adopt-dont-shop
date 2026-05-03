import { globalStyle, style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const formOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '2rem',
});

export const formModal = style({
  background: 'white',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2rem 2rem 1rem 2rem',
  borderBottom: '1px solid #e9ecef',
});

export const modalTitle = style({
  margin: '0',
  color: '#333',
  fontWeight: '600',
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#666',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '50%',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f5f5f5',
    color: '#333',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const form = style({
  padding: '2rem',
});

export const formGroup = style({
  marginBottom: '1.5rem',
});

export const formLabel = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '600',
  color: '#333',
});

export const requiredIndicator = style({
  color: '#dc3545',
});

export const formInput = recipe({
  base: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    ':focus': {
      outline: 'none',
    },
    ':disabled': {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
    },
  },
  variants: {
    hasError: {
      true: {
        border: '2px solid #dc3545',
        ':focus': {
          borderColor: '#dc3545',
        },
      },
      false: {
        border: '2px solid #e9ecef',
        ':focus': {
          borderColor: '#1976d2',
        },
      },
    },
  },
  defaultVariants: {
    hasError: false,
  },
});

export const formError = style({
  display: 'block',
  color: '#dc3545',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});

export const formHelp = style({
  display: 'block',
  color: '#666',
  fontSize: '0.875rem',
  marginTop: '0.25rem',
});

export const formActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e9ecef',
  '@media': {
    '(max-width: 480px)': {
      flexDirection: 'column',
    },
  },
});

export const actionButton = recipe({
  base: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      primary: {
        background: '#1976d2',
        color: 'white',
        ':hover': {
          background: '#1565c0',
        },
      },
      secondary: {
        background: '#f8f9fa',
        color: '#495057',
        border: '1px solid #dee2e6',
        ':hover': {
          background: '#e9ecef',
          color: '#212529',
        },
      },
    },
  },
});

export const formInfo = style({
  background: '#f8f9fa',
  borderRadius: '8px',
  padding: '1.5rem',
  margin: '2rem',
  marginTop: '0',
  border: '1px solid #e9ecef',
});

export const infoSection = style({});

globalStyle(`${infoSection} h4`, {
  margin: '0 0 1rem 0',
  color: '#333',
  fontWeight: '600',
});

globalStyle(`${infoSection} ol`, {
  margin: '0',
  paddingLeft: '1.25rem',
  color: '#666',
});

globalStyle(`${infoSection} ol li`, {
  marginBottom: '0.5rem',
});

export const loadingSpinner = style({
  width: '1rem',
  height: '1rem',
  border: '2px solid transparent',
  borderTop: '2px solid currentColor',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});
