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

export const postGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
  gap: vars.spacing['5'],
});

export const postCard = style({
  display: 'flex',
  flexDirection: 'column',
  background: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.xl,
  boxShadow: vars.shadows.sm,
  overflow: 'hidden',
  textDecoration: 'none',
  transition: `transform ${vars.transitions.fast}, box-shadow ${vars.transitions.fast}, border-color ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: vars.shadows.lg,
      borderColor: vars.colors.primaryBorderSubtle,
    },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
      selectors: { '&:hover': { transform: 'none' } },
    },
  },
});

export const postImage = style({
  width: '100%',
  aspectRatio: '16 / 9',
  objectFit: 'cover',
  display: 'block',
});

export const postImagePlaceholder = style({
  width: '100%',
  aspectRatio: '16 / 9',
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: vars.typography.size['4xl'],
});

export const postBody = style({
  padding: vars.spacing['4'],
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const postDate = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.secondary,
});

export const postTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.snug,
  color: vars.text.primary,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const postExcerpt = style({
  margin: 0,
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.relaxed,
  color: vars.text.secondary,
  overflowWrap: 'anywhere',
  display: '-webkit-box',
  WebkitLineClamp: '3',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: vars.spacing['7'],
});
