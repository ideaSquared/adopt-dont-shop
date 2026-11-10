import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const backToSearchButton = style({
  marginTop: '1rem',
});

export const sectionAlert = style({
  marginBottom: '2rem',
});
