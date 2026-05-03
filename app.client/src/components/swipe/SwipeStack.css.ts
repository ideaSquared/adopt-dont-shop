import { style } from '@vanilla-extract/css';

export const stackContainer = style({
  position: 'relative',
  width: '100%',
  maxWidth: '400px',
  height: '600px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '@media': {
    '(max-width: 768px)': {
      height: '70vh',
      maxWidth: '90vw',
    },
  },
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  textAlign: 'center',
  color: '#666',
  padding: '2rem',
});

export const emptyIcon = style({
  fontSize: '4rem',
  marginBottom: '1rem',
  opacity: 0.5,
});

export const emptyTitle = style({
  fontSize: '1.5rem',
  marginBottom: '0.5rem',
  color: '#333',
});

export const emptyText = style({
  fontSize: '1rem',
  lineHeight: 1.5,
  maxWidth: '300px',
});
