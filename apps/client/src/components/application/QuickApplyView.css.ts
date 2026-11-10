import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '720px',
  margin: '0 auto',
});

export const finalStep = style({
  marginTop: vars.spacing['5'],
  padding: vars.spacing['4'],
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

export const finalTitle = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  fontSize: vars.typography.size.lg,
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
  gap: vars.spacing['3'],
  marginTop: vars.spacing['5'],
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
  fontSize: vars.typography.size.sm,
  color: vars.colors.primaryHover,
  cursor: 'pointer',
  textDecoration: 'underline',
  textAlign: 'left',
  ':hover': {
    color: vars.colors.primaryActive,
  },
});

export const validationAlert = style({
  marginBottom: vars.spacing['3'],
});
