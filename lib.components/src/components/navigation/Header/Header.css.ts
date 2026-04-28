import { style } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../../styles/theme.css';

export const header = style({
  background: vars.background.secondary,
  borderBottom: `1px solid ${vars.border.color.primary}`,
  paddingTop: vars.spacing.md,
  paddingBottom: vars.spacing.md,
  position: 'sticky',
  top: 0,
  zIndex: vars.zIndex.sticky,
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      background: vars.background.primary,
    },
  },
});

export const headerContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  paddingLeft: vars.spacing.md,
  paddingRight: vars.spacing.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const logo = style({
  margin: '0',
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
});

export const navigation = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.md,
});

export const navLink = style({
  color: vars.text.secondary,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  selectors: {
    '&:hover': {
      color: vars.text.primary,
    },
  },
});
