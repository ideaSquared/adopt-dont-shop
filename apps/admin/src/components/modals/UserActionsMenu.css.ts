import { style } from '@vanilla-extract/css';

export const confirmationContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const confirmationMessage = style({
  margin: '0',
  color: '#374151',
  lineHeight: '1.5',
});

export const userInfoBox = style({
  padding: '1rem',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontWeight: '500',
  color: '#111827',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const dangerBox = style({
  padding: '0.75rem 1rem',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  color: '#991b1b',
  fontSize: '0.875rem',
  fontWeight: '500',
});
