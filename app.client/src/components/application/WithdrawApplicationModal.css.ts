import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  padding: '1.5rem',
  maxWidth: '500px',
});

export const title = style({
  color: vars.text.primary,
  marginBottom: '1rem',
  fontSize: '1.5rem',
});

export const description = style({
  color: vars.text.secondary,
  marginBottom: '1.5rem',
  lineHeight: 1.6,
});

export const reasonSection = style({
  marginBottom: '1.5rem',
});

export const label = style({
  display: 'block',
  fontWeight: 500,
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const textArea = style({
  width: '100%',
  minHeight: '100px',
  padding: '0.75rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '0.5rem',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  resize: 'vertical',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary,
    boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}`,
  },
});

export const actionButtons = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
});

export const warningText = style({
  marginBottom: '1.5rem',
});

export const charCounter = style({
  fontSize: '0.8rem',
  color: '#666',
  textAlign: 'right',
  marginTop: '0.25rem',
});

export const errorAlert = style({
  marginBottom: '1rem',
});

export const dangerButton = style({
  backgroundColor: '#dc2626',
  borderColor: '#dc2626',
  color: 'white',
});

export const buttonSpinner = style({
  marginRight: '0.5rem',
});
