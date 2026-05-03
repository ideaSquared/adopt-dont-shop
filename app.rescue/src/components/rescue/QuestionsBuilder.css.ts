import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const sectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
});

globalStyle(`${sectionHeader} h2`, {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0',
});

export const questionCard = recipe({
  base: {
    padding: '1rem 1.25rem',
    marginBottom: '0.5rem',
  },
  variants: {
    isCore: {
      true: {
        background: '#f9fafb',
        border: '1px solid #d1d5db',
        opacity: 0.85,
      },
      false: {
        background: '#ffffff',
        border: '1px solid #e5e7eb',
      },
    },
  },
  defaultVariants: {
    isCore: false,
  },
});

export const questionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
});

export const questionText = style({
  flex: 1,
});

globalStyle(`${questionText} p`, {
  margin: '0 0 0.25rem 0',
  fontSize: '0.9375rem',
  fontWeight: '500',
  color: '#111827',
});

globalStyle(`${questionText} span`, {
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const questionMeta = style({
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  marginTop: '0.5rem',
});

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  variants: {
    variant: {
      required: { background: '#fee2e2', color: '#991b1b' },
      optional: { background: '#e5e7eb', color: '#6b7280' },
      type: { background: '#eff6ff', color: '#1d4ed8' },
      core: { background: '#fef9c3', color: '#854d0e' },
      disabled: { background: '#f3f4f6', color: '#9ca3af' },
      default: { background: '#e5e7eb', color: '#374151' },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexShrink: 0,
});

export const orderControls = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const orderButton = style({
  background: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: '0.25rem',
  padding: '0.125rem 0.375rem',
  cursor: 'pointer',
  fontSize: '0.75rem',
  color: '#6b7280',
  lineHeight: '1',
  selectors: {
    '&:hover:not(:disabled)': {
      background: '#f3f4f6',
      color: '#374151',
    },
  },
  ':disabled': {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
});

export const categorySection = style({
  marginBottom: '2rem',
});

globalStyle(`${categorySection} h3`, {
  fontSize: '1rem',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 0.75rem 0',
  paddingBottom: '0.5rem',
  borderBottom: '2px solid #e5e7eb',
});

export const emptyCategory = style({
  padding: '1rem',
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: '0.875rem',
  background: '#f9fafb',
  border: '1px dashed #d1d5db',
  borderRadius: '0.5rem',
});

export const formContainer = style({
  padding: '1.5rem',
  marginBottom: '1.5rem',
  border: '2px solid #3b82f6',
});

export const formTitle = style({
  fontSize: '1.0625rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 1.25rem 0',
});

export const formGrid = style({
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

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const formGroupFullWidth = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  gridColumn: '1 / -1',
});

export const label = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
});

export const input = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  color: '#1f2937',
  outline: 'none',
  ':focus': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const textArea = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  color: '#1f2937',
  outline: 'none',
  resize: 'vertical',
  minHeight: '80px',
  ':focus': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  color: '#1f2937',
  outline: 'none',
  background: 'white',
  ':focus': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: '#374151',
  cursor: 'pointer',
});

export const formActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const templatesSection = style({
  marginBottom: '1.5rem',
});

globalStyle(`${templatesSection} h4`, {
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#374151',
  margin: '0 0 0.75rem 0',
});

export const templateGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const templateButton = style({
  padding: '0.375rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.8125rem',
  color: '#374151',
  background: 'white',
  cursor: 'pointer',
  ':hover': {
    background: '#f3f4f6',
    borderColor: '#9ca3af',
  },
});

export const helpText = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  margin: '0.25rem 0 0 0',
});

export const errorText = style({
  fontSize: '0.8125rem',
  color: '#dc2626',
  margin: '0.25rem 0 0 0',
});
