import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const filtersContainer = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#111827',
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: 'white',
  color: '#111827',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px #dbeafe',
  },
  ':hover': {
    borderColor: '#9ca3af',
  },
});

export const searchInput = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: 'white',
  color: '#111827',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px #dbeafe',
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const viewToggle = style({
  display: 'flex',
  gap: '0.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const viewButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':focus': {
      outline: 'none',
      boxShadow: '0 0 0 3px #dbeafe',
    },
  },
  variants: {
    active: {
      true: {
        background: '#3b82f6',
        color: 'white',
        ':hover': {
          background: '#2563eb',
        },
      },
      false: {
        background: 'white',
        color: '#111827',
        ':hover': {
          background: '#f3f4f6',
        },
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const clearButton = style({
  padding: '0.5rem 1rem',
  border: 'none',
  background: 'none',
  color: '#2563eb',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const filterGroupRight = style({
  justifyContent: 'flex-end',
});
