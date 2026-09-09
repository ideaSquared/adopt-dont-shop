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
  // ADS-1326: primaryHover (#E11D48) measures ~4.7:1 on white but only
  // ~4.43:1 on the `normal` theme's warm-cream body — axe-core's smoke gate
  // caught it failing AA there. primaryActive (#BE123C) clears 4.5:1 with a
  // real margin (~5.9:1) on both.
  color: vars.colors.primaryActive,
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
