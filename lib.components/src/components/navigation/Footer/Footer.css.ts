import { style } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../../styles/theme.css';

export const footer = style({
  background: vars.background.surface,
  borderTop: `1px solid ${vars.border.color.default}`,
  paddingTop: vars.spacing['5'],
  paddingBottom: vars.spacing['5'],
  marginTop: 'auto',
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      background: vars.background.body,
    },
  },
});

export const footerContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  paddingLeft: vars.spacing['3'],
  paddingRight: vars.spacing['3'],
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
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['3'],
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
