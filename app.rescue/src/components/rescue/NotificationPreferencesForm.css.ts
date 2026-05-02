import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const section = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  padding: '1.5rem',
});

export const sectionTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.25rem 0',
});

export const sectionDescription = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0 0 1.25rem 0',
});

export const toggleRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 0',
  borderBottom: '1px solid #f3f4f6',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
      paddingBottom: '0',
    },
    '&:first-child': {
      paddingTop: '0',
    },
  },
});

export const toggleLabel = style({});

export const toggleName = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
});

export const toggleHint = style({
  display: 'block',
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginTop: '0.125rem',
});

export const toggle = recipe({
  base: {
    position: 'relative',
    width: '2.75rem',
    height: '1.5rem',
    borderRadius: '9999px',
    border: 'none',
    transition: 'background-color 0.2s',
    flexShrink: 0,
    '::after': {
      content: "''",
      position: 'absolute',
      top: '0.125rem',
      width: '1.25rem',
      height: '1.25rem',
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
    },
  },
  variants: {
    enabled: {
      true: {
        backgroundColor: '#3b82f6',
        cursor: 'pointer',
        '::after': {
          left: '1.375rem',
        },
      },
      false: {
        backgroundColor: '#d1d5db',
        cursor: 'pointer',
        '::after': {
          left: '0.125rem',
        },
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
      false: {},
    },
  },
});

export const frequencyOptions = style({
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
});

export const frequencyOption = recipe({
  base: {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      borderColor: '#3b82f6',
    },
  },
  variants: {
    selected: {
      true: {
        border: '2px solid #3b82f6',
        background: '#eff6ff',
        color: '#1d4ed8',
      },
      false: {
        border: '2px solid #e5e7eb',
        background: '#ffffff',
        color: '#374151',
      },
    },
  },
  defaultVariants: {
    selected: false,
  },
});

export const quietHoursGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
  '@media': {
    '(max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const fieldLabel = style({
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.375rem',
});

export const timeInput = style({
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const select = style({
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const actionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
});

export const saveButton = style({
  padding: '0.625rem 1.5rem',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: '#2563eb',
    },
  },
  ':disabled': {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
});

export const successMessage = style({
  fontSize: '0.875rem',
  color: '#065f46',
  background: '#d1fae5',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  margin: '0',
});

export const errorMessage = style({
  fontSize: '0.875rem',
  color: '#991b1b',
  background: '#fee2e2',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  margin: '0',
});

export const loadingContainer = style({
  padding: '3rem',
  textAlign: 'center',
  color: '#6b7280',
  fontSize: '0.875rem',
});
