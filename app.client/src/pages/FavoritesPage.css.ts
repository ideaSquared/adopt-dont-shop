import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  minHeight: '100vh',
  padding: '2rem 0',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '3rem',
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      color: '#333',
      marginBottom: '1rem',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#666',
      maxWidth: '600px',
      margin: '0 auto',
      lineHeight: '1.6',
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '2rem',
  marginBottom: '3rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
    },
  },
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  background: '#f9f9f9',
  borderRadius: '12px',
  margin: '2rem 0',
  selectors: {
    '& .emoji': {
      fontSize: '4rem',
      marginBottom: '1rem',
      display: 'block',
    },
    '& h2': {
      fontSize: '1.8rem',
      color: '#333',
      marginBottom: '1rem',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#666',
      marginBottom: '2rem',
      lineHeight: '1.6',
    },
  },
});

export const ctaButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: '#667eea',
  color: 'white',
  padding: '0.8rem 1.5rem',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '500',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#5a67d8',
    transform: 'translateY(-1px)',
  },
});

export const loginPrompt = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  background: '#f0f4f8',
  borderRadius: '12px',
  margin: '2rem 0',
  selectors: {
    '& h2': {
      fontSize: '1.8rem',
      color: '#333',
      marginBottom: '1rem',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#666',
      marginBottom: '2rem',
      lineHeight: '1.6',
    },
  },
});

export const statsContainer = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '2rem',
  marginBottom: '3rem',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      gap: '1rem',
    },
  },
});

export const statCard = style({
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '1.5rem',
  textAlign: 'center',
  minWidth: '120px',
  selectors: {
    '& .number': {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#667eea',
      marginBottom: '0.5rem',
    },
    '& .label': {
      fontSize: '0.9rem',
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
  },
});

export const errorAlert = style({
  margin: '2rem 0',
});
