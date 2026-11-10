import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  padding: vars.spacing['4'],
  maxWidth: '500px',
});

export const title = style({
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
  fontSize: vars.typography.size['2xl'],
});

export const description = style({
  color: vars.text.secondary,
  marginBottom: vars.spacing['4'],
  lineHeight: 1.6,
});

export const reasonSection = style({
  marginBottom: vars.spacing['4'],
});

export const label = style({
  display: 'block',
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
  marginBottom: vars.spacing['2'],
});

export const textArea = style({
  width: '100%',
  minHeight: '100px',
  padding: '0.75rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  resize: 'vertical',
  ':focus-visible': {
    outline: 'none',
    borderColor: vars.colors.primary,
    boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}`,
  },
});

export const actionButtons = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
});

export const warningText = style({
  marginBottom: vars.spacing['4'],
});

export const charCounter = style({
  fontSize: '0.8rem',
  color: '#666',
  textAlign: 'right',
  marginTop: vars.spacing['1'],
});

export const errorAlert = style({
  marginBottom: vars.spacing['3'],
});

export const dangerButton = style({
  backgroundColor: '#dc2626',
  borderColor: '#dc2626',
  color: 'white',
});

export const buttonSpinner = style({
  marginRight: vars.spacing['2'],
});
