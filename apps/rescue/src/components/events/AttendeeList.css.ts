import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const listContainer = style({
  width: '100%',
});

export const checkInBadge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '9999px',
  },
  variants: {
    checkedIn: {
      true: { background: '#dcfce7', color: '#166534' },
      false: { background: '#fef3c7', color: '#92400e' },
    },
  },
  defaultVariants: {
    checkedIn: false,
  },
});

export const checkInButton = style({
  padding: '0.375rem 0.75rem',
  border: '1px solid #2563eb',
  background: 'white',
  color: '#2563eb',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#2563eb',
    color: 'white',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const checkedInBadge = style({
  fontSize: '0.75rem',
  color: '#10b981',
});
