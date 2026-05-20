import { style } from '@vanilla-extract/css';

export const shell = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
});

export const main = style({
  flex: '1',
});

export const skipLink = style({
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  zIndex: 9999,
  selectors: {
    '&:focus': {
      left: '0.75rem',
      top: '0.75rem',
      width: 'auto',
      height: 'auto',
      padding: '0.5rem 0.875rem',
      background: '#111827',
      color: '#ffffff',
      borderRadius: '0.375rem',
      textDecoration: 'none',
      fontWeight: 600,
      outline: '2px solid #fff',
      outlineOffset: '2px',
    },
  },
});
