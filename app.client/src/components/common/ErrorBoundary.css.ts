import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const errorContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
  minHeight: '200px',
  background: vars.colors.semantic.error['50'],
  border: `1px solid ${vars.colors.semantic.error['200']}`,
  borderRadius: vars.border.radius.lg,
  margin: '1rem',
});

export const errorTitle = style({
  color: vars.colors.semantic.error['700'],
  margin: '0 0 1rem 0',
  fontSize: '1.5rem',
  fontWeight: '600',
});

export const errorMessage = style({
  color: vars.colors.semantic.error['600'],
  margin: '0 0 1.5rem 0',
  fontSize: '1rem',
  maxWidth: '500px',
});

export const retryButton = style({
  background: vars.colors.primary['500'],
  color: 'white',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: vars.border.radius.md,
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  ':hover': {
    background: vars.colors.primary['600'],
  },
  ':focus': {
    outline: `2px solid ${vars.colors.primary['300']}`,
    outlineOffset: '2px',
  },
});
