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

export const articleContent = style({
  color: vars.text.primary,
  maxWidth: '70ch',
  lineHeight: vars.typography.lineHeight.relaxed,
  fontSize: vars.typography.size.lg,
});

globalStyle(
  `${articleContent} h1, ${articleContent} h2, ${articleContent} h3, ${articleContent} h4, ${articleContent} h5, ${articleContent} h6`,
  {
    color: vars.text.primary,
    margin: `${vars.spacing['6']} 0 ${vars.spacing['3']}`,
    lineHeight: vars.typography.lineHeight.tight,
  }
);

globalStyle(`${articleContent} p`, {
  margin: `0 0 ${vars.spacing['4']}`,
});

globalStyle(`${articleContent} a`, {
  color: vars.text.link,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  overflowWrap: 'anywhere',
});

globalStyle(`${articleContent} a:hover`, {
  color: vars.text.linkHover,
});

globalStyle(`${articleContent} img`, {
  maxWidth: '100%',
  borderRadius: vars.border.radius.base,
  margin: `${vars.spacing['3']} 0`,
});

globalStyle(`${articleContent} ul, ${articleContent} ol`, {
  paddingLeft: vars.spacing['5'],
  marginBottom: vars.spacing['4'],
});

globalStyle(`${articleContent} blockquote`, {
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
