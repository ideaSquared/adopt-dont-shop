import { style } from '@vanilla-extract/css';

export const overlay = style({
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
  padding: '1rem',
});

export const overlayHidden = style({
  display: 'none',
});

export const modal = style({
  background: '#ffffff',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeader = style({
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const modalTitle = style({
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  color: '#6b7280',
  cursor: 'pointer',
  padding: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f3f4f6',
    color: '#111827',
  },
});

export const modalBody = style({
  padding: '1.5rem',
});

export const reportInfo = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
});

export const reportTitle = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  marginBottom: '0.25rem',
});

export const reportText = style({
  fontSize: '1rem',
  fontWeight: '500',
  color: '#111827',
});

export const formGroup = style({
  marginBottom: '1.5rem',
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const select = style({
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#111827',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const textArea = style({
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#111827',
  minHeight: '100px',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const input = style({
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  background: '#ffffff',
  color: '#111827',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const helpText = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.25rem',
  marginBottom: 0,
});

export const modalFooter = style({
  padding: '1.5rem',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});

export const buttonSecondary = style({
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  ':hover:not(:disabled)': {
    background: '#f9fafb',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const buttonPrimary = style({
  padding: '0.625rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: 'none',
  background: '#667eea',
  color: '#ffffff',
  ':hover:not(:disabled)': {
    background: '#5a67d8',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});
