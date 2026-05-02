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

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '2rem',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      gap: '1rem',
    },
  },
});

export const headerContent = style({
  flex: 1,
  selectors: {
    '& h1': {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#111827',
      margin: '0 0 0.5rem 0',
    },
    '& p': {
      fontSize: '1.1rem',
      color: '#6b7280',
      margin: 0,
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

export const statCard = style({
  padding: '1.5rem',
  textAlign: 'center',
});

export const statNumber = style({
  fontSize: '2rem',
  fontWeight: 700,
  color: '#2563eb',
  marginBottom: '0.5rem',
});

export const statLabel = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '150px',
  color: '#6b7280',
});

export const errorContainer = style({
  padding: '2rem',
  textAlign: 'center',
  border: '1px solid #ef4444',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  borderRadius: '0.5rem',
});
