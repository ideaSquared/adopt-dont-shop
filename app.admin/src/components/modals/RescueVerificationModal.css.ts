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
  zIndex: 1100,
  padding: '1rem',
});

export const modalContainer = style({
  background: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '550px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const modalHeaderApprove = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  background: '#d1fae5',
  borderRadius: '16px 16px 0 0',
});

export const modalHeaderReject = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  background: '#fee2e2',
  borderRadius: '16px 16px 0 0',
});

export const iconWrapperApprove = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: '#ffffff',
  color: '#10b981',
});

export const iconWrapperReject = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: '#ffffff',
  color: '#ef4444',
});

export const headerContent = style({
  flex: 1,
});

export const modalBody = style({
  padding: '1.5rem',
});

export const formGroup = style({
  marginBottom: '1.25rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const textArea = style({
  width: '100%',
  minHeight: '100px',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  color: '#111827',
  resize: 'vertical',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const infoBox = style({
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.25rem',
});

export const infoLabel = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
});

export const infoValue = style({
  fontSize: '0.9375rem',
  color: '#111827',
  fontWeight: '500',
});

export const modalFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  padding: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const errorMessage = style({
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '0.875rem',
  color: '#991b1b',
  fontSize: '0.875rem',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const requiredIndicator = style({
  color: '#ef4444',
  marginLeft: '0.25rem',
});
