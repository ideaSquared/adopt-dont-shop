import { style } from '@vanilla-extract/css';

export const promptContainer = style({
  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '2rem',
  color: '#1565c0',
  boxShadow: '0 4px 12px rgba(187, 222, 251, 0.4)',
  borderLeft: '4px solid #2196f3',
});

export const promptHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'between',
  marginBottom: '1rem',
});

export const promptHeaderLeft = style({
  display: 'flex',
  alignItems: 'center',
});

export const promptHeaderIcon = style({
  fontSize: '1.5rem',
  marginRight: '0.75rem',
});

export const promptHeaderTitle = style({
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#1565c0',
});

export const dismissButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.25rem',
  color: '#1565c0',
  cursor: 'pointer',
  opacity: 0.7,
  ':hover': {
    opacity: 1,
  },
});

export const promptContent = style({});

export const promptContentP = style({
  margin: '0 0 1rem 0',
  lineHeight: 1.5,
  color: '#1565c0',
});

export const progressContainer = style({
  marginBottom: '1.5rem',
});

export const progressBar = style({
  background: 'rgba(255, 255, 255, 0.5)',
  height: '8px',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '0.5rem',
});

export const progressFill = style({
  height: '100%',
  background: '#2196f3',
  transition: 'width 0.3s ease',
});

export const progressText = style({
  fontSize: '0.875rem',
  color: '#1976d2',
  fontWeight: 500,
});

export const missingFields = style({
  background: 'rgba(255, 255, 255, 0.3)',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
});

export const missingFieldsTitle = style({
  margin: '0 0 0.75rem 0',
  fontSize: '1rem',
  color: '#1565c0',
});

export const fieldList = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const fieldTag = style({
  background: 'rgba(33, 150, 243, 0.2)',
  color: '#1565c0',
  padding: '0.25rem 0.75rem',
  borderRadius: '20px',
  fontSize: '0.875rem',
  fontWeight: 500,
});

export const benefits = style({
  marginBottom: '1.5rem',
});

export const benefitItem = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '0.5rem',
});

export const benefitIcon = style({
  marginRight: '0.5rem',
  fontSize: '1rem',
});

export const benefitText = style({
  fontSize: '0.875rem',
  color: '#1976d2',
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

export const completeButton = style({
  background: '#2196f3',
  color: 'white',
  border: 'none',
  fontWeight: 600,
  padding: '0.75rem 1.5rem',
  ':hover': {
    background: '#1976d2',
    transform: 'translateY(-1px)',
  },
});

export const skipButton = style({
  background: 'transparent',
  color: '#1565c0',
  border: '2px solid #1565c0',
  fontWeight: 500,
  padding: '0.75rem 1.5rem',
  ':hover': {
    background: 'rgba(21, 101, 192, 0.1)',
  },
});
