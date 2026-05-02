import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  maxWidth: '640px',
});

export const stepTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

export const stepDescription = style({
  color: vars.text.secondary,
  margin: '0 0 2rem 0',
});

export const requiredNote = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  margin: '0 0 1.5rem 0',
});
