import { style } from '@vanilla-extract/css';

export const wrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.5rem 0 1rem 0',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '1rem',
});

export const breadcrumb = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  flexWrap: 'wrap',
  fontSize: '0.8125rem',
  color: '#6b7280',
  minWidth: 0,
});

export const segmentLink = style({
  color: '#4b5563',
  textDecoration: 'none',
  borderRadius: '4px',
  padding: '0.125rem 0.25rem',
  ':hover': {
    color: '#111827',
    textDecoration: 'underline',
  },
  ':focus-visible': {
    outline: '2px solid #667eea',
    outlineOffset: '2px',
  },
});

export const segmentCurrent = style({
  color: '#111827',
  fontWeight: 600,
});

export const separator = style({
  color: '#9ca3af',
  userSelect: 'none',
});

export const navButtons = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  flexShrink: 0,
});

export const navButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2rem',
  height: '2rem',
  padding: 0,
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  color: '#374151',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  ':hover': {
    background: '#f3f4f6',
    borderColor: '#9ca3af',
  },
  ':focus-visible': {
    outline: '2px solid #667eea',
    outlineOffset: '2px',
  },
  ':disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
    background: '#f9fafb',
  },
});
