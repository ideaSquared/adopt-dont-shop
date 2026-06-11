import { recipe } from '@vanilla-extract/recipes';

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
  },
  variants: {
    variant: {
      success: {
        background: '#dcfce7',
        color: '#166534',
        border: '1px solid #bbf7d0',
      },
      danger: {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fecaca',
      },
      warning: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fde68a',
      },
      primary: {
        background: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #bfdbfe',
      },
      secondary: {
        background: '#f3f4f6',
        color: '#374151',
        border: '1px solid #d1d5db',
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});
