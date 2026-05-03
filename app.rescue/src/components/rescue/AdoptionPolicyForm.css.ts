import { style } from '@vanilla-extract/css';

export const formContainer = style({
  padding: '2rem',
  marginBottom: '2rem',
});

export const formSection = style({
  marginBottom: '2rem',
  selectors: {
    '&:last-child': {
      marginBottom: '0',
    },
  },
});

export const sectionTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 1rem 0',
  paddingBottom: '0.5rem',
  borderBottom: '2px solid #e5e7eb',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
  marginBottom: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const listInput = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const listItem = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
});

export const listItemInput = style({
  flex: 1,
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  transition: 'border-color 0.2s',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const removeButton = style({
  padding: '0.5rem 0.75rem',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#fecaca',
  },
});

export const addButton = style({
  padding: '0.5rem 1rem',
  backgroundColor: '#dbeafe',
  color: '#1e40af',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#bfdbfe',
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const checkboxWrapper = style({
  marginBottom: '0.75rem',
});
