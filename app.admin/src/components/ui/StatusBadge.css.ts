import { recipe } from '@vanilla-extract/recipes';

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
  },
  variants: {
    variant: {
      success: { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' },
      warning: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
      error: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
      info: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
      neutral: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    },
    size: {
      small: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
      medium: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
      large: { padding: '0.5rem 1rem', fontSize: '1rem' },
    },
  },
});
