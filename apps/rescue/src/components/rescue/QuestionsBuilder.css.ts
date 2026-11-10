import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const sectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['3'],
});

globalStyle(`${sectionHeader} h2`, {
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: '#1f2937',
  margin: '0',
});

export const questionCard = recipe({
  base: {
    padding: '1rem 1.25rem',
    marginBottom: vars.spacing['2'],
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
  gap: vars.spacing['3'],
});

export const questionText = style({
  flex: 1,
});

globalStyle(`${questionText} p`, {
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontSize: '0.9375rem',
  fontWeight: vars.typography.weight.medium,
  color: '#111827',
});

globalStyle(`${questionText} span`, {
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const questionMeta = style({
  display: 'flex',
  gap: vars.spacing['2'],
  flexWrap: 'wrap',
  marginTop: vars.spacing['2'],
});

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: vars.border.radius.pill,
    fontSize: vars.typography.size.xs,
    fontWeight: vars.typography.weight.medium,
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
  gap: vars.spacing['2'],
  alignItems: 'center',
  flexShrink: 0,
});

export const orderControls = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const categorySection = style({
  marginBottom: vars.spacing['5'],
});

globalStyle(`${categorySection} h3`, {
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#374151',
  margin: '0 0 0.75rem 0',
  paddingBottom: vars.spacing['2'],
  borderBottom: '2px solid #e5e7eb',
});

export const emptyCategory = style({
  padding: vars.spacing['3'],
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: vars.typography.size.sm,
  background: '#f9fafb',
  border: '1px dashed #d1d5db',
  borderRadius: vars.border.radius.base,
});

export const formContainer = style({
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
  border: '2px solid #3b82f6',
});

export const formTitle = style({
  fontSize: '1.0625rem',
  fontWeight: vars.typography.weight.semibold,
  color: '#1f2937',
  margin: '0 0 1.25rem 0',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
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
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: '#374151',
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: vars.typography.size.sm,
  color: '#1f2937',
  outline: 'none',
  background: 'white',
  ':focus-visible': {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
  },
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  color: '#374151',
  cursor: 'pointer',
});

export const formActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: vars.spacing['3'],
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e5e7eb',
});

export const templatesSection = style({
  marginBottom: vars.spacing['4'],
});

globalStyle(`${templatesSection} h4`, {
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#374151',
  margin: '0 0 0.75rem 0',
});

export const templateGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
});

export const helpText = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  margin: `${vars.spacing['1']} 0 0 0`,
});

export const loadingState = style({
  textAlign: 'center',
  padding: vars.spacing['6'],
  color: '#6b7280',
});

export const questionTextEnabled = style({
  textDecoration: 'none',
  color: '#111827',
});

export const questionTextDisabled = style({
  textDecoration: 'line-through',
  color: '#9ca3af',
});

export const helpTextEnabled = style({
  color: '#6b7280',
});

export const helpTextDisabled = style({
  color: '#d1d5db',
});
