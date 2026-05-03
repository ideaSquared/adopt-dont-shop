import { globalStyle, style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const spin = keyframes({
  to: { transform: 'rotate(360deg)' },
});

export const container = style({
  position: 'relative',
});

export const trigger = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  variants: {
    disabled: {
      true: {
        background: '#d1d5db',
        cursor: 'not-allowed',
        opacity: 0.6,
      },
      false: {
        background: '#2563eb',
        cursor: 'pointer',
        selectors: {
          '&:hover': {
            background: '#1d4ed8',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

export const dropdown = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    minWidth: '200px',
    padding: '0.5rem',
  },
  variants: {
    isOpen: {
      true: { display: 'block' },
      false: { display: 'none' },
    },
  },
  defaultVariants: {
    isOpen: false,
  },
});

export const exportOption = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#111827',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  variants: {
    loading: {
      true: {
        cursor: 'wait',
        opacity: 0.6,
      },
      false: {
        cursor: 'pointer',
        selectors: {
          '&:hover': {
            background: '#f3f4f6',
            color: '#1d4ed8',
          },
        },
      },
    },
  },
  defaultVariants: {
    loading: false,
  },
});

globalStyle(`${exportOption.classNames.base} svg`, {
  fontSize: '1rem',
  flexShrink: 0,
});

export const optionLabel = style({
  flex: 1,
});

export const loadingSpinner = style({
  width: '14px',
  height: '14px',
  border: '2px solid #d1d5db',
  borderTopColor: '#2563eb',
  borderRadius: '50%',
  animation: `${spin} 0.6s linear infinite`,
});
