import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  flexWrap: 'wrap',
});

export const selectionInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#1e40af',
  whiteSpace: 'nowrap',
});

globalStyle(`${selectionInfo} svg`, {
  fontSize: '1.125rem',
});

export const divider = style({
  width: '1px',
  height: '20px',
  background: '#bfdbfe',
});

export const actionGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
  flex: 1,
});

export const actionButton = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.875rem',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    ':hover': {
      filter: 'brightness(0.95)',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      danger: { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' },
      warning: { background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' },
      primary: { background: '#dbeafe', color: '#1e40af', borderColor: '#93c5fd' },
      neutral: { background: '#f3f4f6', color: '#374151', borderColor: '#d1d5db' },
    },
  },
});

export const clearButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.375rem 0.625rem',
  background: 'transparent',
  border: '1px solid #93c5fd',
  borderRadius: '6px',
  fontSize: '0.8125rem',
  color: '#1e40af',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  marginLeft: 'auto',
  ':hover': {
    background: '#dbeafe',
  },
});

globalStyle(`${clearButton} svg`, {
  fontSize: '0.875rem',
});

export const selectAllButton = style({
  background: 'none',
  border: 'none',
  fontSize: '0.8125rem',
  color: '#2563eb',
  cursor: 'pointer',
  padding: '0',
  textDecoration: 'underline',
  ':hover': {
    color: '#1d4ed8',
  },
});
