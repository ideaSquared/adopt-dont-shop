import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const shell = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.body,
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '64px',
  padding: `0 ${vars.spacing['3']}`,
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const logo = style({
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
  ':focus-visible': {
    outline: `2px solid ${vars.border.color.focus}`,
    outlineOffset: '2px',
    borderRadius: vars.border.radius.sm,
  },
});

export const switchLink = style({
  color: vars.colors.primaryHover,
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
  padding: `${vars.spacing['5']} ${vars.spacing['3']}`,
});

export const footer = style({
  display: 'flex',
  justifyContent: 'center',
  padding: `${vars.spacing['3']} ${vars.spacing['3']}`,
  borderTop: `1px solid ${vars.border.color.default}`,
});
