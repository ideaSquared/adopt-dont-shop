import { fallbackVar, style } from '@vanilla-extract/css';

import { brand, gray, white } from '../../../styles/colors';
import { vars } from '../../../styles/theme.css';

// The boundary is usually mounted outside ThemeProvider, which only puts the theme
// class on <html> inside a useEffect. If the tree crashes on first render the theme
// variables are not defined yet, so every colour falls back to its light-theme value.
const colour = {
  body: fallbackVar(vars.background.body, gray[100]),
  surface: fallbackVar(vars.background.surface, white),
  mutedSurface: fallbackVar(vars.background.muted, gray[100]),
  heading: fallbackVar(vars.text.primary, gray[900]),
  bodyText: fallbackVar(vars.text.secondary, gray[700]),
  onPrimary: fallbackVar(vars.text.inverse, white),
  border: fallbackVar(vars.border.color.muted, gray[300]),
  danger: fallbackVar(vars.colors.danger, brand.danger),
  primary: fallbackVar(vars.colors.primary, brand.primary),
  primaryHover: fallbackVar(vars.colors.primaryHover, brand.primaryHover),
};

export const container = style({
  minHeight: '100vh',
  backgroundColor: colour.body,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: vars.spacing['4'],
});

export const card = style({
  maxWidth: '28rem',
  width: '100%',
  backgroundColor: colour.surface,
  border: `1px solid ${colour.border}`,
  borderRadius: vars.border.radius.lg,
  boxShadow: vars.shadows.lg,
  padding: vars.spacing['6'],
  textAlign: 'center',
});

export const icon = style({
  margin: `0 auto ${vars.spacing['4']}`,
  height: '3rem',
  width: '3rem',
  color: colour.danger,
});

export const title = style({
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: colour.heading,
  margin: `0 0 ${vars.spacing['2']}`,
});

export const message = style({
  color: colour.bodyText,
  margin: `0 0 ${vars.spacing['6']}`,
});

export const actions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  '@media': {
    '(min-width: 480px)': {
      flexDirection: 'row',
      justifyContent: 'center',
    },
  },
});

const buttonBase = style({
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  cursor: 'pointer',
  border: '1px solid transparent',
  transition: `background-color ${vars.transitions.fast}`,
  selectors: {
    '&:focus-visible': { outline: `2px solid ${colour.primary}`, outlineOffset: '2px' },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});

export const primaryButton = style([
  buttonBase,
  {
    backgroundColor: colour.primary,
    color: colour.onPrimary,
    selectors: { '&:hover': { backgroundColor: colour.primaryHover } },
  },
]);

export const secondaryButton = style([
  buttonBase,
  {
    backgroundColor: colour.surface,
    color: colour.heading,
    borderColor: colour.border,
    selectors: { '&:hover': { backgroundColor: colour.mutedSurface } },
  },
]);

export const details = style({
  marginTop: vars.spacing['6'],
  textAlign: 'left',
  fontSize: vars.typography.size.sm,
  color: colour.bodyText,
});

export const summary = style({
  cursor: 'pointer',
  color: colour.heading,
});

export const stack = style({
  marginTop: vars.spacing['2'],
  padding: vars.spacing['3'],
  backgroundColor: colour.mutedSurface,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.xs,
  overflow: 'auto',
  maxHeight: '12rem',
});
