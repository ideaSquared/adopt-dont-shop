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

export const placeholderText = style({
  padding: '2rem',
  background: vars.background.secondary,
  borderRadius: '8px',
  textAlign: 'center',
  color: vars.text.secondary,
});
