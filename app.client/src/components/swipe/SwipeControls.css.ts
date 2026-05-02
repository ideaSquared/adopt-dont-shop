import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const controlsContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  padding: '1rem',
  '@media': {
    '(max-width: 768px)': {
      gap: '0.75rem',
      padding: '0.75rem',
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
    transition: 'all 0.2s ease',
    fontSize: '1.5rem',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    selectors: {
      '&:not(:disabled):hover': {
        transform: 'scale(1.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      '&:not(:disabled):active': {
        transform: 'scale(0.95)',
      },
    },
  },
  variants: {
    variant: {
      pass: {
        width: '50px',
        height: '50px',
        background: '#ff6b6b',
        color: 'white',
        boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
        selectors: {
          '&:not(:disabled):hover': {
            background: '#ee5a5a',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
          },
        },
      },
      info: {
        width: '45px',
        height: '45px',
        background: '#ffd93d',
        color: 'white',
        boxShadow: '0 2px 8px rgba(255, 217, 61, 0.3)',
        selectors: {
          '&:not(:disabled):hover': {
            background: '#ffcd02',
            boxShadow: '0 4px 12px rgba(255, 217, 61, 0.4)',
          },
        },
      },
      like: {
        width: '60px',
        height: '60px',
        background: '#4ecdc4',
        color: 'white',
        boxShadow: '0 2px 8px rgba(78, 205, 196, 0.3)',
        selectors: {
          '&:not(:disabled):hover': {
            background: '#45b7b8',
            boxShadow: '0 4px 12px rgba(78, 205, 196, 0.4)',
          },
        },
      },
      super: {
        width: '45px',
        height: '45px',
        background: '#74b9ff',
        color: 'white',
        boxShadow: '0 2px 8px rgba(116, 185, 255, 0.3)',
        selectors: {
          '&:not(:disabled):hover': {
            background: '#0984e3',
            boxShadow: '0 4px 12px rgba(116, 185, 255, 0.4)',
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
});
