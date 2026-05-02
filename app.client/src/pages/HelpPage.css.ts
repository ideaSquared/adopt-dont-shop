import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '3rem 0',
  minHeight: 'calc(100vh - 200px)',
});

export const pageHeader = style({
  textAlign: 'center',
  marginBottom: '3rem',
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: '#111827',
      margin: '0 0 1rem 0',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#6b7280',
      maxWidth: '600px',
      margin: '0 auto',
    },
  },
});

export const articleList = style({
  maxWidth: '720px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const articleCard = style({
  display: 'block',
  padding: '1.5rem',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  textDecoration: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ':hover': {
    borderColor: '#2563eb',
    boxShadow: '0 2px 12px rgba(37, 99, 235, 0.1)',
  },
});

export const articleTitle = style({
  fontSize: '1.1rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.4rem 0',
});

export const articleExcerpt = style({
  fontSize: '0.9rem',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  color: '#6b7280',
  fontSize: '1.1rem',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: '4rem',
});
