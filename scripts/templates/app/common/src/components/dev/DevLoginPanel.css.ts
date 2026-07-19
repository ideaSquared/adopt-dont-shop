import { style } from '@vanilla-extract/css';

export const devPanel = style({
  position: 'fixed',
  top: 20,
  right: 20,
  background: 'rgba(0, 0, 0, 0.9)',
  color: 'white',
  padding: 16,
  borderRadius: 8,
  zIndex: 1000,
  minWidth: 250,
  fontFamily: "'Courier New', monospace",
  fontSize: 12,
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  '@media': {
    'screen and (max-width: 768px)': {
      position: 'relative',
      top: 'auto',
      right: 'auto',
      margin: 16,
      width: 'calc(100% - 32px)',
    },
  },
});

export const devButton = style({
  background: '#007acc',
  color: 'white',
  border: 'none',
  padding: '8px 12px',
  margin: 4,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  selectors: {
    '&:hover': {
      background: '#005a9e',
    },
  },
});

export const devTitle = style({
  margin: '0 0 12px 0',
  color: '#00ff88',
  fontSize: 14,
});

export const userInfo = style({
  background: 'rgba(255, 255, 255, 0.1)',
  padding: 8,
  borderRadius: 4,
  marginTop: 8,
  fontSize: 11,
});
