import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '720px',
  margin: '0 auto',
});

export const finalStep = style({
  marginTop: '2rem',
  padding: '1.5rem',
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.75rem',
});

export const finalTitle = style({
  margin: '0 0 0.5rem 0',
  fontSize: '1.125rem',
  color: vars.text.primary,
});

export const finalDescription = style({
  margin: '0 0 1.25rem 0',
  fontSize: '0.9375rem',
  color: vars.text.secondary,
});

export const actions = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  marginTop: '2rem',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 640px)': {
      flexDirection: 'column-reverse',
      alignItems: 'stretch',
    },
  },
});

export const switchLink = style({
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: '0.875rem',
  color: vars.colors.primary['600'],
  cursor: 'pointer',
  textDecoration: 'underline',
  textAlign: 'left',
  ':hover': {
    color: vars.colors.primary['700'],
  },
});

export const validationAlert = style({
  marginBottom: '1rem',
});
