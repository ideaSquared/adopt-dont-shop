import { style } from '@vanilla-extract/css';

export const dashboardContainer = style({
  maxWidth: 'none',
  margin: 0,
  width: '100%',
  padding: 0,
});

export const dashboardHeader = style({
  marginBottom: '2rem',
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

export const welcomeMessage = style({
  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '2rem',
  selectors: {
    '& h2': {
      margin: '0 0 0.5rem 0',
      color: '#1e40af',
      fontSize: '1.25rem',
    },
    '& p': {
      margin: 0,
      color: '#1d4ed8',
    },
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});
