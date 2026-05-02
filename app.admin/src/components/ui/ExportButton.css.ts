import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  position: 'relative',
  display: 'inline-block',
});

export const triggerButton = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    transition: 'all 0.2s ease',
    selectors: {
      '& svg': {
        fontSize: '1rem',
      },
    },
  },
  variants: {
    disabled: {
      true: { cursor: 'not-allowed', opacity: 0.6 },
      false: {
        cursor: 'pointer',
        ':hover': {
          background: '#f9fafb',
          borderColor: '#9ca3af',
        },
      },
    },
  },
});

export const dropdown = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    minWidth: '180px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  variants: {
    isOpen: {
      true: { display: 'block' },
      false: { display: 'none' },
    },
  },
});

export const dropdownHeader = style({
  padding: '0.5rem 1rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #f3f4f6',
});

export const formatItem = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontSize: '0.875rem',
  color: '#111827',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
  ':hover': {
    background: '#f9fafb',
  },
  selectors: {
    '& svg': {
      fontSize: '1rem',
      color: '#6b7280',
      flexShrink: 0,
    },
  },
});

export const formatLabel = style({
  flex: 1,
});

export const formatDesc = style({
  fontSize: '0.75rem',
  color: '#9ca3af',
});
