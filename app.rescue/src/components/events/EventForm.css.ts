import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const formContainer = style({
  background: 'white',
  borderRadius: '12px',
  padding: '2rem',
  maxWidth: '800px',
  margin: '0 auto',
});

export const formTitle = style({
  margin: '0 0 1.5rem 0',
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#111827',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#111827',
});

export const input = style({
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px #dbeafe',
  },
});

export const textArea = style({
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  minHeight: '100px',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px #dbeafe',
  },
});

export const select = style({
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px #dbeafe',
  },
});

export const checkboxGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const checkbox = style({
  width: '1.25rem',
  height: '1.25rem',
  cursor: 'pointer',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const button = recipe({
  base: {
    padding: '0.75rem 1.5rem',
    border: 'none',
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
    variant: {
      primary: {
        background: '#2563eb',
        color: 'white',
        ':hover': {
          background: '#1d4ed8',
        },
      },
      secondary: {
        background: '#f3f4f6',
        color: '#111827',
        ':hover': {
          background: '#e5e7eb',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

export const helperText = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});
