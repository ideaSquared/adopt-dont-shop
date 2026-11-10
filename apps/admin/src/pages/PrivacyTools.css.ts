import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  padding: '1.5rem',
  display: 'grid',
  gap: '1.5rem',
  maxWidth: '48rem',
});

export const fieldGroupSpaced = style({
  display: 'grid',
  gap: '0.5rem',
  marginTop: '0.5rem',
});

export const section = style({
  borderTop: `1px solid ${vars.border.color.default}`,
  paddingTop: '1rem',
});

export const buttonIcon = style({
  marginRight: '0.5rem',
});

export const deleteButton = style({
  marginTop: '0.5rem',
});
