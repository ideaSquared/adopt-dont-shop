import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '3rem 0',
  maxWidth: '800px',
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: '#6b7280',
  textDecoration: 'none',
  fontSize: '0.9rem',
  marginBottom: '2rem',
  ':hover': {
    color: '#111827',
  },
});

export const featuredImage = style({
  width: '100%',
  maxHeight: '400px',
  objectFit: 'cover',
  borderRadius: '12px',
  marginBottom: '2rem',
});

export const postTitle = style({
  fontSize: '2.5rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 1rem 0',
  lineHeight: '1.3',
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1.8rem',
    },
  },
});

export const postMeta = style({
  display: 'flex',
  gap: '1rem',
  color: '#6b7280',
  fontSize: '0.9rem',
  marginBottom: '2.5rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const postContent = style({
  color: '#111827',
  lineHeight: '1.8',
  fontSize: '1.05rem',
  selectors: {
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: '#111827',
      margin: '2rem 0 1rem',
    },
    '& p': {
      margin: '0 0 1.2rem',
    },
    '& a': {
      color: '#2563eb',
    },
    '& a:hover': {
      textDecoration: 'underline',
    },
    '& img': {
      maxWidth: '100%',
      borderRadius: '8px',
      margin: '1rem 0',
    },
    '& ul, & ol': {
      paddingLeft: '1.5rem',
      marginBottom: '1.2rem',
    },
    '& blockquote': {
      borderLeft: '4px solid #2563eb',
      margin: '1.5rem 0',
      padding: '0.5rem 1.5rem',
      color: '#6b7280',
      fontStyle: 'italic',
    },
  },
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: '4rem',
});

export const notFound = style({
  textAlign: 'center',
  padding: '4rem',
  color: '#6b7280',
});
