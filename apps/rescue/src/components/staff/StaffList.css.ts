import { style } from '@vanilla-extract/css';

export const listContainer = style({
  background: 'white',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

export const listControls = style({
  marginBottom: '2rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid #e9ecef',
});

export const searchFilters = style({
  display: 'flex',
  gap: '1rem',
  marginBottom: '1rem',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const searchInput = style({
  flex: 1,
  minWidth: '200px',
});

export const filterSelect = style({
  minWidth: '180px',
});

export const staffCount = style({
  fontSize: '0.875rem',
  color: '#666',
  fontWeight: '500',
});

export const staffGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: '1.5rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const loadingContainer = style({
  padding: '2rem',
  textAlign: 'center',
});

export const loadingSpinner = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 1rem',
});

export const emptyContainer = style({
  maxWidth: '400px',
  margin: '0 auto',
});

export const emptyIcon = style({
  fontSize: '3rem',
  marginBottom: '1rem',
});

export const emptyTitle = style({
  margin: '0 0 0.5rem 0',
  color: '#333',
  fontWeight: '600',
});

export const emptyText = style({
  margin: '0',
  color: '#666',
});
