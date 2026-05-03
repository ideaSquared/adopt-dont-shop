import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '0 1rem',
    },
  },
});

export const section = style({
  padding: '4rem 0',
  '@media': {
    '(max-width: 768px)': {
      padding: '3rem 0',
    },
  },
});

globalStyle(`${section} h2`, {
  textAlign: 'center',
  fontSize: '2.5rem',
  marginBottom: '3rem',
  color: '#111827',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '2rem',
  marginBottom: '3rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '1.5rem',
    },
  },
});

export const statsSection = style({
  backgroundColor: '#f9fafb',
  padding: '4rem 0',
});

globalStyle(`${statsSection} .stats-grid`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '2rem',
  textAlign: 'center',
});

globalStyle(`${statsSection} .stat-item h3`, {
  fontSize: '3rem',
  color: '#6366f1',
  marginBottom: '0.5rem',
});

globalStyle(`${statsSection} .stat-item p`, {
  fontSize: '1.25rem',
  color: '#6b7280',
});

globalStyle(`${statsSection} .stat-item h3`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2rem',
    },
  },
});

globalStyle(`${statsSection} .stat-item p`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1rem',
    },
  },
});

export const ctaSection = style({
  backgroundColor: '#6366f1',
  color: 'white',
  padding: '4rem 0',
  textAlign: 'center',
});

globalStyle(`${ctaSection} h2`, {
  color: 'white',
  marginBottom: '1rem',
});

globalStyle(`${ctaSection} p`, {
  fontSize: '1.25rem',
  marginBottom: '2rem',
  maxWidth: '500px',
  marginLeft: 'auto',
  marginRight: 'auto',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const errorMessage = style({
  textAlign: 'center',
  padding: '2rem',
  color: '#ef4444',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  margin: '2rem 0',
});
