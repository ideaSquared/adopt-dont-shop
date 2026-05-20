import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// ADS-480: catch-all 404 page. Brand colors hard-coded here (matching
// the original styled-components version) — out of scope to refactor
// to theme tokens; this file only exists to drop the styled-components
// dependency.
export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  padding: '2rem',
  textAlign: 'center',
});

export const code = style({
  fontSize: '4rem',
  margin: 0,
  color: vars.colors.infoHover,
});

export const title = style({
  margin: '0.5rem 0 1rem',
  fontSize: '1.5rem',
  color: vars.text.primary,
});

export const body = style({
  color: vars.text.tertiary,
  maxWidth: '32rem',
  margin: '0 0 1.5rem',
});

export const homeLink = style({
  color: 'white',
  backgroundColor: vars.colors.infoHover,
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  ':hover': {
    backgroundColor: vars.colors.infoActive,
  },
});
