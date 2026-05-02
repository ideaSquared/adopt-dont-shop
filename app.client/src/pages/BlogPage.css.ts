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

export const postGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '2rem',
});

export const postCard = style({
  display: 'flex',
  flexDirection: 'column',
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  overflow: 'hidden',
  textDecoration: 'none',
  transition: 'transform 0.2s, box-shadow 0.2s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
});

export const postImage = style({
  width: '100%',
  height: '200px',
  objectFit: 'cover',
});

export const postImagePlaceholder = style({
  width: '100%',
  height: '200px',
  background: '#f9fafb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '3rem',
});

export const postBody = style({
  padding: '1.5rem',
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const postTitle = style({
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
  lineHeight: '1.4',
});

export const postExcerpt = style({
  fontSize: '0.9rem',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.6',
  flex: '1',
  display: '-webkit-box',
  WebkitLineClamp: '3',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const postDate = style({
  fontSize: '0.8rem',
  color: '#6b7280',
  marginTop: '0.5rem',
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
