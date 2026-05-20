import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const controlsContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.25rem 1rem',
  '@media': {
    '(max-width: 480px)': {
      gap: '0.75rem',
      padding: '1rem 0.5rem',
    },
  },
});

export const actionButton = recipe({
  base: {
    border: 'none',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease',
    background: 'white',
    fontSize: '1.5rem',
    flexShrink: 0,
    ':disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    ':focus-visible': {
      outline: '3px solid rgba(78, 205, 196, 0.6)',
      outlineOffset: '2px',
    },
    selectors: {
      '&:not(:disabled):hover': {
        transform: 'translateY(-3px)',
      },
      '&:not(:disabled):active': {
        transform: 'translateY(0) scale(0.95)',
      },
    },
  },
  variants: {
    variant: {
      undo: {
        width: '48px',
        height: '48px',
        color: '#f59e0b',
        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
        fontSize: '1.3rem',
        selectors: {
          '&:not(:disabled):hover': {
            boxShadow: '0 8px 22px rgba(245, 158, 11, 0.35)',
            background: '#fffbeb',
          },
        },
      },
      pass: {
        width: '64px',
        height: '64px',
        color: '#ef4444',
        boxShadow: '0 6px 18px rgba(239, 68, 68, 0.3)',
        fontSize: '1.9rem',
        selectors: {
          '&:not(:disabled):hover': {
            boxShadow: '0 10px 28px rgba(239, 68, 68, 0.4)',
            background: '#fef2f2',
          },
        },
      },
      info: {
        width: '48px',
        height: '48px',
        color: '#8b5cf6',
        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
        fontSize: '1.3rem',
        selectors: {
          '&:not(:disabled):hover': {
            boxShadow: '0 8px 22px rgba(139, 92, 246, 0.35)',
            background: '#f5f3ff',
          },
        },
      },
      super: {
        width: '48px',
        height: '48px',
        color: '#0ea5e9',
        boxShadow: '0 4px 14px rgba(14, 165, 233, 0.25)',
        fontSize: '1.3rem',
        selectors: {
          '&:not(:disabled):hover': {
            boxShadow: '0 8px 22px rgba(14, 165, 233, 0.35)',
            background: '#f0f9ff',
          },
        },
      },
      like: {
        width: '64px',
        height: '64px',
        color: '#22c55e',
        boxShadow: '0 6px 18px rgba(34, 197, 94, 0.3)',
        fontSize: '1.9rem',
        selectors: {
          '&:not(:disabled):hover': {
            boxShadow: '0 10px 28px rgba(34, 197, 94, 0.4)',
            background: '#f0fdf4',
          },
        },
      },
    },
  },
  defaultVariants: { variant: 'like' },
});

export const buttonIcon = style({
  fontSize: 'inherit',
  lineHeight: 1,
  display: 'flex',
});
