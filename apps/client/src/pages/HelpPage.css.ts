import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Vertical padding per side, so the Container keeps its horizontal gutters.
export const pageContainer = style({
  paddingTop: vars.spacing['6'],
  paddingBottom: vars.spacing['7'],
  minHeight: 'calc(100vh - 200px)',
});

export const header = style({
  marginBottom: vars.spacing['6'],
});

export const articleList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const articleCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['4'],
  padding: vars.spacing['4'],
  background: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.xl,
  boxShadow: vars.shadows.sm,
  textDecoration: 'none',
  transition: `border-color ${vars.transitions.fast}, box-shadow ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      borderColor: vars.colors.primaryBorderSubtle,
      boxShadow: vars.shadows.base,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});

export const articleIcon = style({
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: vars.spacing['6'],
  height: vars.spacing['6'],
  borderRadius: vars.border.radius.pill,
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primary,
  fontSize: vars.typography.size.xl,
});

export const articleText = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const articleTitle = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.snug,
  color: vars.text.primary,
  overflowWrap: 'anywhere',
});

export const articleExcerpt = style({
  margin: 0,
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.normal,
  color: vars.text.secondary,
  overflowWrap: 'anywhere',
});

export const articleChevron = style({
  flexShrink: 0,
  color: vars.text.tertiary,
  selectors: {
    [`${articleCard}:hover &`]: { color: vars.colors.primary },
  },
});

export const contactPrompt = style({
  marginTop: vars.spacing['6'],
  padding: vars.spacing['5'],
  background: vars.colors.primaryBgSubtle,
  border: `${vars.border.width.thin} solid ${vars.colors.primaryBorderSubtle}`,
  borderRadius: vars.border.radius.xl,
});

export const contactTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const contactText = style({
  margin: `${vars.spacing['1']} 0 0`,
  color: vars.text.secondary,
});

export const contactLink = style({
  color: vars.text.link,
  fontWeight: vars.typography.weight.semibold,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  selectors: {
    '&:hover': { color: vars.text.linkHover },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
      borderRadius: vars.border.radius.sm,
    },
  },
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: vars.spacing['7'],
});
