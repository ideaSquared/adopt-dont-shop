import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Vertical padding per side, so the Container keeps its horizontal gutters.
export const pageContainer = style({
  paddingTop: vars.spacing['5'],
  paddingBottom: vars.spacing['7'],
});

export const header = style({
  marginBottom: vars.spacing['5'],
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  color: vars.text.secondary,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  marginBottom: vars.spacing['5'],
  selectors: {
    '&:hover': { color: vars.text.primary },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
      borderRadius: vars.border.radius.sm,
    },
  },
});

export const featuredImage = style({
  width: '100%',
  maxHeight: '400px',
  objectFit: 'cover',
  borderRadius: vars.border.radius.lg,
  marginBottom: vars.spacing['5'],
});

export const postContent = style({
  color: vars.text.primary,
  maxWidth: '70ch',
  lineHeight: vars.typography.lineHeight.relaxed,
  fontSize: vars.typography.size.lg,
});

globalStyle(
  `${postContent} h1, ${postContent} h2, ${postContent} h3, ${postContent} h4, ${postContent} h5, ${postContent} h6`,
  {
    color: vars.text.primary,
    margin: `${vars.spacing['6']} 0 ${vars.spacing['3']}`,
    lineHeight: vars.typography.lineHeight.tight,
  }
);

globalStyle(`${postContent} p`, {
  margin: `0 0 ${vars.spacing['4']}`,
});

globalStyle(`${postContent} a`, {
  color: vars.text.link,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  overflowWrap: 'anywhere',
});

globalStyle(`${postContent} a:hover`, {
  color: vars.text.linkHover,
});

globalStyle(`${postContent} img`, {
  maxWidth: '100%',
  borderRadius: vars.border.radius.base,
  margin: `${vars.spacing['3']} 0`,
});

globalStyle(`${postContent} ul, ${postContent} ol`, {
  paddingLeft: vars.spacing['5'],
  marginBottom: vars.spacing['4'],
});

globalStyle(`${postContent} blockquote`, {
  borderLeft: `3px solid ${vars.colors.primary}`,
  borderRadius: vars.border.radius.base,
  background: vars.background.muted,
  margin: `${vars.spacing['4']} 0`,
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
  color: vars.text.secondary,
});

export const spinnerWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  padding: vars.spacing['7'],
});
