import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(75, 85, 99, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 60,
});

export const modal = style({
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  maxWidth: '28rem',
  width: '90%',
  padding: '1.5rem',
});

export const header = style({
  marginBottom: '1.5rem',
});

export const title = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.5rem 0',
});

export const subtitle = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: 0,
});

export const stageDisplay = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  margin: '1.5rem 0',
  padding: '1rem',
  background: '#f9fafb',
  borderRadius: '0.5rem',
});

export const stageBox = style({
  flex: 1,
  padding: '0.75rem',
  color: 'white',
  borderRadius: '0.375rem',
  textAlign: 'center',
  fontSize: '0.875rem',
  fontWeight: '600',
});

export const arrow = style({
  fontSize: '1.25rem',
  color: '#9ca3af',
});

export const formField = style({
  marginBottom: '1rem',
});

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const textArea = style({
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  resize: 'vertical',
  minHeight: '100px',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const actionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem',
});

export const actionOption = recipe({
  base: {
    padding: '0.75rem',
    borderRadius: '0.375rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#3b82f6',
      background: '#eff6ff',
    },
  },
  variants: {
    selected: {
      true: {
        border: '2px solid #3b82f6',
        background: '#eff6ff',
      },
      false: {
        border: '2px solid #e5e7eb',
        background: 'white',
      },
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const actionLabel = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '0.25rem',
});

export const actionDescription = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: '1.5rem',
});

export const button = recipe({
  base: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  variants: {
    variant: {
      primary: {
        background: '#3b82f6',
        color: 'white',
        ':hover': { background: '#2563eb' },
        ':disabled': {
          background: '#9ca3af',
          cursor: 'not-allowed',
        },
      },
      secondary: {
        background: '#f3f4f6',
        color: '#374151',
        ':hover': { background: '#e5e7eb' },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});
