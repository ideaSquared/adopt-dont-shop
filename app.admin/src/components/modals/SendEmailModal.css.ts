import { style } from '@vanilla-extract/css';

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
  minHeight: '200px',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  color: '#111827',
  background: '#ffffff',
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
  background: '#f9fafb',
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

export const helpText = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  marginTop: '0.375rem',
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

export const successMessage = style({
  background: '#d1fae5',
  border: '1px solid #a7f3d0',
  borderRadius: '8px',
  padding: '0.875rem',
  color: '#065f46',
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

export const templateGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
  marginBottom: '1.25rem',
});

export const templateCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '1rem',
  border: '2px solid #d1d5db',
  borderRadius: '8px',
  background: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textAlign: 'left',
  ':hover': {
    borderColor: '#667eea',
    background: '#f5f3ff',
  },
  ':disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
});

export const templateCardSelected = style({
  borderColor: '#667eea',
  background: '#f5f3ff',
});

export const templateIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  background: '#f9fafb',
  color: '#6b7280',
  marginBottom: '0.75rem',
});

export const templateIconSelected = style({
  background: '#ede9fe',
  color: '#667eea',
});

export const templateName = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '0.25rem',
});

export const templateDescription = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  lineHeight: 1.4,
});

export const templatePreview = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.25rem',
});

export const previewLabel = style({
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.5rem',
});

export const previewSubject = style({
  fontSize: '0.9375rem',
  color: '#111827',
  fontWeight: '600',
  marginBottom: '0.5rem',
});

export const previewDescription = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: 1.5,
});

export const footerButtons = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
});
