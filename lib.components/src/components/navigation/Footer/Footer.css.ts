import { style } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../../styles/theme.css';

export const footer = style({
  background: vars.background.secondary,
  borderTop: `1px solid ${vars.border.color.primary}`,
  paddingTop: vars.spacing.xl,
  paddingBottom: vars.spacing.xl,
  marginTop: 'auto',
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      background: vars.background.primary,
    },
  },
});

export const footerContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  paddingLeft: vars.spacing.md,
  paddingRight: vars.spacing.md,
  textAlign: 'center',
});

export const footerText = style({
  margin: '0',
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
});

export const footerLinks = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing.lg,
  marginBottom: vars.spacing.md,
});

export const footerLink = style({
  color: vars.text.secondary,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  selectors: {
    '&:hover': {
      color: vars.text.primary,
    },
  },
});
