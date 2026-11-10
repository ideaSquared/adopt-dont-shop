import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const statusFilterContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: 0,
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
