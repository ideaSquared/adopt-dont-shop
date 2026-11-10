import { style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  width: '100%',
  padding: '1rem',
  '@media': {
    'screen and (min-width: 768px)': {
      padding: '1.5rem',
    },
  },
});

export const contentWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  '@media': {
    'screen and (min-width: 768px)': {
      gap: '1.25rem',
    },
  },
});

export const headerActions = style({
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      justifyContent: 'stretch',
    },
  },
});

export const filtersContainer = style({
  margin: 0,
});

export const statusFilterSection = style({
  marginBottom: '1rem',
});

export const advancedFiltersSection = style({
  margin: 0,
});

export const mainContent = style({
  margin: 0,
  padding: 0,
});

export const statsContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
});

export const setupCard = style({
  padding: '2rem',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '1rem auto',
});

export const setupEmoji = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const setupHint = style({
  marginBottom: '1.5rem',
  color: '#6b7280',
});

export const setupActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  flexWrap: 'wrap',
});

export const devNote = style({
  marginTop: '1.5rem',
  padding: '1rem',
  background: '#f3f4f6',
  borderRadius: '8px',
});

export const devNoteIntro = style({
  margin: '0.5rem 0',
  fontSize: '0.875rem',
});

export const devNoteSteps = style({
  textAlign: 'left',
  fontSize: '0.875rem',
  margin: 0,
});
