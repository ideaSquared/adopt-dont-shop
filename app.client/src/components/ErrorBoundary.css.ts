import { style } from '@vanilla-extract/css';

export const errorContainer = style({
  minHeight: '100vh',
  backgroundColor: '#f9fafb',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1rem',
});

export const errorCard = style({
  maxWidth: '28rem',
  width: '100%',
  backgroundColor: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  padding: '1.5rem',
  textAlign: 'center',
});

export const iconContainer = style({
  marginBottom: '1rem',
});

export const errorIcon = style({
  margin: '0 auto',
  height: '3rem',
  width: '3rem',
  color: '#ef4444',
});

export const errorTitle = style({
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '0.5rem',
});

export const errorMessage = style({
  color: '#4b5563',
  marginBottom: '1.5rem',
});

export const buttonContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const primaryButton = style({
  width: '100%',
  backgroundColor: '#2563eb',
  color: 'white',
  fontWeight: '500',
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#1d4ed8',
  },
});

export const secondaryButton = style({
  width: '100%',
  backgroundColor: '#4b5563',
  color: 'white',
  fontWeight: '500',
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#374151',
  },
});

export const errorDetails = style({
  marginTop: '1.5rem',
  textAlign: 'left',
});

export const errorSummary = style({
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: '#6b7280',
  transition: 'color 0.2s',
  ':hover': {
    color: '#374151',
  },
});

export const errorContent = style({
  marginTop: '0.5rem',
  padding: '0.75rem',
  backgroundColor: '#f3f4f6',
  borderRadius: '0.25rem',
  fontSize: '0.75rem',
  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  color: '#1f2937',
  overflow: 'auto',
  maxHeight: '10rem',
});

export const errorStack = style({
  whiteSpace: 'pre-wrap',
  marginTop: '0.25rem',
});
