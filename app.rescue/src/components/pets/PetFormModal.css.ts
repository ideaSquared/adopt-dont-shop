import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const modalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
});

export const modalContent = style({
  width: '100%',
  maxWidth: '800px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
  selectors: {
    '& h2': {
      margin: '0 0 1.5rem 0',
      color: '#111827',
      fontSize: '1.5rem',
      fontWeight: '600',
    },
  },
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1.5rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = recipe({
  base: {
    selectors: {
      '& label': {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '500',
        fontSize: '0.875rem',
        color: '#111827',
      },
      '& input, & select, & textarea': {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        fontSize: '0.875rem',
        fontFamily: 'inherit',
      },
      '& textarea': {
        resize: 'vertical',
        minHeight: '100px',
      },
      '& .error': {
        color: '#ef4444',
        fontSize: '0.75rem',
        marginTop: '0.25rem',
      },
    },
  },
  variants: {
    fullWidth: {
      true: { gridColumn: '1 / -1' },
      false: {},
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

export const checkboxGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '0.5rem',
  selectors: {
    '& input[type="checkbox"]': {
      width: 'auto',
    },
    '& label': {
      margin: 0,
      fontWeight: 'normal',
    },
  },
});

export const modalActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column-reverse',
    },
  },
});
