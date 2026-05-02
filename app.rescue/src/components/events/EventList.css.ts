import { style } from '@vanilla-extract/css';

export const listContainer = style({
  width: '100%',
});

export const eventGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '1.5rem',
  width: '100%',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const loadingState = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '3rem',
  fontSize: '1rem',
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
  fontSize: '4rem',
  marginBottom: '1rem',
  opacity: 0.5,
});

export const emptyStateTitle = style({
  margin: '0 0 0.5rem 0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
});

export const emptyStateText = style({
  margin: 0,
  fontSize: '0.875rem',
  color: '#6b7280',
});
