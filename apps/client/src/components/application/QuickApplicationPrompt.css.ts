import { style } from '@vanilla-extract/css';

export const promptContainer = style({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '2rem',
  color: 'white',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
});

export const promptHeader = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const promptHeaderIcon = style({
  fontSize: '1.5rem',
  marginRight: '0.75rem',
});

export const promptHeaderTitle = style({
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 600,
});

export const promptContent = style({});

export const promptContentP = style({
  margin: '0 0 1rem 0',
  opacity: 0.9,
  lineHeight: 1.5,
});

export const benefits = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '1.5rem',
});

export const benefit = style({
  background: 'rgba(255, 255, 255, 0.2)',
  padding: '0.25rem 0.75rem',
  borderRadius: '20px',
  fontSize: '0.875rem',
  fontWeight: 500,
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 480px)': {
      flexDirection: 'column',
    },
  },
});

export const quickApplyButton = style({
  background: 'white',
  color: '#667eea',
  border: 'none',
  fontWeight: 600,
  padding: '0.75rem 1.5rem',
  ':hover': {
    background: '#f8f9ff',
    transform: 'translateY(-1px)',
  },
});

export const regularButton = style({
  background: 'transparent',
  color: 'white',
  border: '2px solid rgba(255, 255, 255, 0.5)',
  fontWeight: 500,
  padding: '0.75rem 1.5rem',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'white',
  },
});
