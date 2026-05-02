import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '2rem',
  selectors: {
    '& h1': {
      color: '#111827',
      marginBottom: '0.5rem',
    },
    '& p': {
      color: '#4b5563',
      fontSize: '1.1rem',
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});
