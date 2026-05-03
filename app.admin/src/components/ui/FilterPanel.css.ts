import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const panelContainer = style({
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.5rem',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
});

export const title = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
});

globalStyle(`${title} svg`, {
  color: '#6b7280',
});

export const clearButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.5rem 0.75rem',
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#9ca3af',
  },
});

globalStyle(`${clearButton} svg`, {
  fontSize: '1rem',
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1rem',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
});

export const select = style({
  width: '100%',
  padding: '0.625rem 2.5rem 0.625rem 0.75rem',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#111827',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
  ':disabled': {
    background: '#f9fafb',
    cursor: 'not-allowed',
  },
});

export const input = style({
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  color: '#111827',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
  '::placeholder': {
    color: '#9ca3af',
  },
  ':disabled': {
    background: '#f9fafb',
    cursor: 'not-allowed',
  },
});

export const applyButton = style({
  marginTop: '1rem',
  width: '100%',
  padding: '0.75rem',
  background: vars.colors.primary['600'],
  border: 'none',
  borderRadius: '6px',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primary['700'],
  },
});
