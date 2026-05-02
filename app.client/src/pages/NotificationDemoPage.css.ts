import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '3rem',
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      color: '#111827',
      marginBottom: '1rem',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#6b7280',
      maxWidth: '600px',
      margin: '0 auto',
    },
  },
});

export const section = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '2rem',
  marginBottom: '2rem',
  selectors: {
    '& h2': {
      fontSize: '1.5rem',
      color: '#111827',
      marginBottom: '1rem',
    },
    '& p': {
      color: '#6b7280',
      marginBottom: '1.5rem',
    },
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  marginBottom: '1rem',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const statusCard = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  selectors: {
    '& .status-item': {
      textAlign: 'center',
    },
    '& .status-item .label': {
      fontSize: '0.875rem',
      color: '#6b7280',
      marginBottom: '0.5rem',
    },
    '& .status-item .value': {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#111827',
    },
  },
});

export const notificationModal = style({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: '1000',
  padding: '1rem',
});

export const modalContent = style({
  width: '100%',
  maxWidth: '800px',
  maxHeight: '90vh',
  overflow: 'hidden',
});
