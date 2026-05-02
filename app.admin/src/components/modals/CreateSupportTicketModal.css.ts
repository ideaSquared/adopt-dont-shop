import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
});

export const select = style({
  padding: '0.625rem 0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#9ca3af',
  },
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const textArea = style({
  padding: '0.625rem 0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: '150px',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#9ca3af',
  },
  ':focus': {
    outline: 'none',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const recipientInfo = style({
  padding: '1rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const recipientLabel = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
});

export const recipientName = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
});

export const recipientEmail = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const errorMessage = style({
  padding: '0.75rem 1rem',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  color: '#991b1b',
  fontSize: '0.875rem',
});

export const successMessage = style({
  padding: '0.75rem 1rem',
  background: '#d1fae5',
  border: '1px solid #a7f3d0',
  borderRadius: '8px',
  color: '#065f46',
  fontSize: '0.875rem',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const infoBox = style({
  padding: '0.75rem 1rem',
  background: '#dbeafe',
  border: '1px solid #93c5fd',
  borderRadius: '8px',
  color: '#1e40af',
  fontSize: '0.875rem',
});
