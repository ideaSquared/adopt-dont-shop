import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const statusFilterContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: 0,
});

export const statusButton = recipe({
  base: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid',
    ':focus': {
      outline: '2px solid #60a5fa',
      outlineOffset: '2px',
    },
    ':focus:not(:focus-visible)': {
      outline: 'none',
    },
  },
  variants: {
    active: {
      true: {
        borderColor: '#3b82f6',
        background: '#3b82f6',
        color: 'white',
        ':hover': {
          background: '#2563eb',
          borderColor: '#2563eb',
        },
      },
      false: {
        borderColor: '#d1d5db',
        background: 'white',
        color: '#6b7280',
        ':hover': {
          borderColor: '#3b82f6',
          background: '#eff6ff',
          color: '#1d4ed8',
        },
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const statusCount = recipe({
  base: {
    marginLeft: '0.5rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  variants: {
    active: {
      true: {
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      },
      false: {
        background: '#e5e7eb',
        color: '#6b7280',
        border: 'none',
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});
