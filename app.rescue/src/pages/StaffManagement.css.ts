import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '2rem',
  gap: '2rem',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const headerContent = style({});

globalStyle(`${headerContent} h1`, {
  margin: '0 0 0.5rem 0',
  fontSize: '2rem',
  color: '#333333',
  fontWeight: 600,
});

globalStyle(`${headerContent} p`, {
  margin: 0,
  color: '#666666',
  fontSize: '1.1rem',
});

export const headerActions = style({
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
});

export const actionButtonPrimary = style({
  background: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#1565c0',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});

export const actionButtonSecondary = style({
  background: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#5a6268',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});

export const alertError = style({
  background: '#f8d7da',
  color: '#721c24',
  border: '1px solid #f5c6cb',
  borderRadius: '8px',
  padding: '1rem 1.5rem',
  marginBottom: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const alertSuccess = style({
  background: '#d4edda',
  color: '#155724',
  border: '1px solid #c3e6cb',
  borderRadius: '8px',
  padding: '1rem 1.5rem',
  marginBottom: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const alertClose = style({
  background: 'none',
  border: 'none',
  color: 'inherit',
  fontSize: '1.25rem',
  cursor: 'pointer',
  padding: '0.25rem',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
  },
});

export const pageContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const section = style({});

globalStyle(`${section} h2`, {
  margin: '0 0 1rem 0',
  color: '#333333',
  fontWeight: 600,
  fontSize: '1.5rem',
});

export const errorState = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

export const errorIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const errorTitle = style({
  margin: '0 0 1rem 0',
  color: '#333333',
  fontWeight: 600,
});

export const errorText = style({
  margin: '0 0 2rem 0',
  color: '#666666',
});

export const retryButton = style({
  background: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#1565c0',
    },
  },
});
