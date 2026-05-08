import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

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

export const reasonTextArea = style({
  padding: '0.625rem 0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#ffffff',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: '100px',
  width: '100%',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#9ca3af',
  },
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
});

export const warningBox = style({
  padding: '0.75rem 1rem',
  background: '#fef3c7',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  color: '#92400e',
  fontSize: '0.875rem',
  fontWeight: '500',
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

export const reasonLabel = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#374151',
});
