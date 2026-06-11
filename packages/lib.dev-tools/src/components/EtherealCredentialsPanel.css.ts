import { style } from '@vanilla-extract/css';

export const etherealSection = style({
  background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
  border: '1px solid #7dd3fc',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)',
  position: 'relative',
  selectors: {
    '&::before': {
      content: "''",
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
      borderRadius: '12px 12px 0 0',
    },
  },
});

export const etherealHeader = style({
  margin: '0 0 1rem 0',
  color: '#0c4a6e',
  fontSize: '1rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  selectors: {
    '&::before': {
      content: "'📧'",
      fontSize: '1.2rem',
    },
  },
});

export const credentialRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.5rem',
  fontSize: '0.8rem',
});

export const credentialLabel = style({
  color: '#64748b',
  fontWeight: 500,
});

export const credentialValue = style({
  color: '#1e293b',
  fontFamily: "'Courier New', monospace",
  background: 'rgba(255, 255, 255, 0.8)',
  padding: '0.25rem 0.5rem',
  borderRadius: '3px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 1)',
    },
  },
});

export const etherealButton = style({
  background: '#0ea5e9',
  color: 'white',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  cursor: 'pointer',
  marginRight: '0.5rem',
  marginBottom: '0.5rem',
  transition: 'background-color 0.2s ease',
  selectors: {
    '&:hover': {
      background: '#0284c7',
    },
    '&:disabled': {
      background: '#94a3b8',
      cursor: 'not-allowed',
    },
  },
});
