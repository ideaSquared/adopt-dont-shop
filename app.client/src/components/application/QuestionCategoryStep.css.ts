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

export const errorSummary = style({
  border: `1px solid ${vars.colors.semantic.error['500']}`,
  background: vars.colors.semantic.error['50'],
  padding: '0.75rem 1rem',
  borderRadius: '0.375rem',
  margin: '0 0 1.5rem 0',
  color: vars.colors.semantic.error['700'],
});

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
