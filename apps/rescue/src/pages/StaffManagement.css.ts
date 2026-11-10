import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const headerActions = style({
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  '@media': {
    // The header stacks vertically on mobile; let the action buttons stack and
    // fill the width too rather than crowding onto one cramped row.
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
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
