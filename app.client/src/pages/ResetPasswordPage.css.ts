import { style } from '@vanilla-extract/css';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
});

export const resetPasswordCard = style({
  width: '100%',
  maxWidth: '450px',
  padding: '2rem',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '2rem',
  selectors: {
    '& h1': {
      fontSize: '2rem',
      marginBottom: '0.5rem',
      color: '#111827',
    },
    '& p': {
      color: '#6b7280',
      lineHeight: '1.6',
    },
  },
});

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

export const passwordRequirements = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  marginTop: '0.5rem',
  selectors: {
    '& h4': {
      fontSize: '0.9rem',
      color: '#111827',
      margin: '0 0 0.5rem 0',
    },
    '& ul': {
      margin: '0',
      paddingLeft: '1.5rem',
      listStyle: 'disc',
    },
    '& li': {
      fontSize: '0.85rem',
      color: '#6b7280',
      lineHeight: '1.5',
    },
  },
});

export const backToLoginLink = style({
  fontSize: '0.9rem',
  color: '#6366f1',
  textDecoration: 'none',
  textAlign: 'center',
  marginTop: '1rem',
  display: 'block',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const styledAlert = style({
  marginBottom: '1.5rem',
});

export const successContainer = style({
  textAlign: 'center',
  selectors: {
    '& h2': {
      fontSize: '1.5rem',
      color: '#059669',
      marginBottom: '1rem',
    },
    '& p': {
      color: '#6b7280',
      lineHeight: '1.6',
      marginBottom: '1.5rem',
    },
    '& .redirect-message': {
      fontSize: '0.9rem',
      color: '#9ca3af',
      fontStyle: 'italic',
    },
  },
});
