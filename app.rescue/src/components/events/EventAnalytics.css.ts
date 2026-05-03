import { style } from '@vanilla-extract/css';

export const analyticsContainer = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const title = style({
  margin: '0 0 1.5rem 0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1.5rem',
  marginBottom: '1.5rem',
});

export const metricCard = style({
  padding: '1.5rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const metricLabel = style({
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  marginBottom: '0.5rem',
});

export const metricValue = style({
  fontSize: '2rem',
  fontWeight: '700',
  color: '#111827',
  marginBottom: '0.25rem',
});

export const metricSubtext = style({
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const progressBar = style({
  width: '100%',
  height: '8px',
  background: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden',
  marginTop: '0.5rem',
});

export const progressFill = style({
  height: '100%',
  transition: 'width 0.3s ease',
});

export const section = style({
  marginBottom: '1.5rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionTitle = style({
  margin: '0 0 1rem 0',
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
});

export const demographicRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  marginBottom: '0.5rem',
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const loadingState = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '3rem',
  color: '#6b7280',
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  textAlign: 'center',
});

export const emptyStateIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
  opacity: 0.5,
});

export const emptyStateText = style({
  margin: 0,
  fontSize: '0.875rem',
  color: '#6b7280',
});
