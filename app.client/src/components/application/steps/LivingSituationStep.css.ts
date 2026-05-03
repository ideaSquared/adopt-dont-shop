import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  maxWidth: '600px',
});

export const stepTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const stepDescription = style({
  color: vars.text.secondary,
  marginBottom: '2rem',
});

export const form = style({
  display: 'grid',
  gap: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
});

export const label = style({
  fontWeight: 500,
  color: vars.text.primary,
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
});

export const styledSelect = style({
  padding: '0.75rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '8px',
  fontSize: '1rem',
  background: vars.background.primary,
  color: vars.text.primary,
});

export const checkboxGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});
