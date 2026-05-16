import { style } from '@vanilla-extract/css';

// ADS-480: catch-all 404 page for app.rescue. Brand colors hard-coded
// (matching the original styled-components version); refactoring to
// theme tokens is out of scope.
export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  padding: '2rem',
  textAlign: 'center',
});

export const code = style({
  fontSize: '4rem',
  margin: 0,
  color: '#15803d',
});

export const title = style({
  margin: '0.5rem 0 1rem',
  fontSize: '1.5rem',
  color: '#1f2937',
});

export const body = style({
  color: '#4b5563',
  maxWidth: '32rem',
  margin: '0 0 1.5rem',
});

export const homeLink = style({
  color: 'white',
  backgroundColor: '#15803d',
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  ':hover': {
    backgroundColor: '#166534',
  },
});
