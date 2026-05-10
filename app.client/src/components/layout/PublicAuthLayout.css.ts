import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const shell = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.primary,
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '64px',
  padding: `0 ${vars.spacing['4']}`,
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

export const logo = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontWeight: 700,
  fontSize: vars.typography.size.lg,
  color: vars.text.primary,
  textDecoration: 'none',
  ':focus-visible': {
    outline: `2px solid ${vars.border.color.focus}`,
    outlineOffset: '2px',
    borderRadius: vars.border.radius.sm,
  },
});

export const logoIcon = style({
  fontSize: '1.5rem',
  lineHeight: 1,
});

export const switchLink = style({
  color: vars.colors.primary['600'],
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: vars.typography.size.sm,
  ':hover': {
    textDecoration: 'underline',
  },
  ':focus-visible': {
    outline: `2px solid ${vars.border.color.focus}`,
    outlineOffset: '2px',
    borderRadius: vars.border.radius.sm,
  },
});

export const main = style({
  flex: 1,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: `${vars.spacing['8']} ${vars.spacing['4']}`,
});

export const footer = style({
  display: 'flex',
  justifyContent: 'center',
  padding: `${vars.spacing['4']} ${vars.spacing['4']}`,
  borderTop: `1px solid ${vars.border.color.primary}`,
});
