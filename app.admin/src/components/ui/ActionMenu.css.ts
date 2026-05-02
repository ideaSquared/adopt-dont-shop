import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const menuContainer = style({
  position: 'relative',
  display: 'inline-block',
});

export const triggerButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  padding: '0',
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#9ca3af',
    color: '#374151',
  },
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
  },
  selectors: {
    '& svg': {
      fontSize: '1.125rem',
    },
  },
});

export const dropdown = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    minWidth: '200px',
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

export const menuItem = recipe({
  base: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    selectors: {
      '& svg': {
        fontSize: '1rem',
        flexShrink: 0,
      },
    },
  },
  variants: {
    danger: {
      true: {
        color: '#ef4444',
        ':hover': { background: '#fef2f2' },
      },
      false: {
        color: '#111827',
        ':hover': { background: '#f9fafb' },
      },
    },
    disabled: {
      true: {
        color: '#9ca3af',
        cursor: 'not-allowed',
        opacity: 0.5,
        ':hover': { background: 'transparent' },
      },
      false: {},
    },
  },
});

export const divider = style({
  height: '1px',
  background: '#e5e7eb',
  margin: '0.25rem 0',
});
