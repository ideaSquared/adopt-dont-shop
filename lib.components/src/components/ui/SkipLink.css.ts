import { style } from '@vanilla-extract/css';

// Visually hidden until focused. The :focus reveal pattern is repeated across
// all three apps; consolidated here so the keyboard-only skip-to-main link
// behaves consistently.
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
      outline: '2px solid #ffffff',
      outlineOffset: '2px',
    },
  },
});
