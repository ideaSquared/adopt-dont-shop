import { globalStyle, style } from '@vanilla-extract/css';

export const filtersContainer = style({
  padding: '0.75rem',
  marginBottom: 0,
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
});

export const filtersHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.75rem',
});

globalStyle(`${filtersHeader} h3`, {
  margin: 0,
  color: '#111827',
  fontSize: '1.25rem',
  fontWeight: '600',
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '0.75rem',
    },
  },
});

export const filterGroup = style({});

export const filterLabel = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  fontSize: '0.875rem',
  color: '#111827',
});

export const filterInput = style({
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  background: 'white',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const filterSelect = style({
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  background: 'white',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const filterActions = style({
  display: 'flex',
  gap: '0.75rem',
  marginTop: '0.75rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #e5e7eb',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      gap: '0.5rem',
    },
  },
});
