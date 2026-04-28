import { globalStyle } from '@vanilla-extract/css';

import { vars } from './theme.css';

// NOTE: Add Google Fonts to your app's index.html:
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Playfair+Display:wght@400..900&display=swap" rel="stylesheet">

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('html', {
  fontSize: '16px',
  scrollBehavior: 'smooth',
  WebkitTextSizeAdjust: '100%',
  textSizeAdjust: '100%',
});

globalStyle('body', {
  backgroundColor: vars.background.primary,
  color: vars.text.primary,
  fontFamily: vars.typography.family.sans,
  fontSize: vars.typography.size.base,
  lineHeight: vars.typography.lineHeight.normal,
  fontWeight: vars.typography.weight.normal,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
  WebkitTapHighlightColor: 'transparent',
});

globalStyle('h1, h2, h3, h4, h5, h6', {
  fontFamily: vars.typography.family.display,
  fontWeight: vars.typography.weight.bold,
  lineHeight: vars.typography.lineHeight.tight,
  marginBottom: vars.spacing.md,
  color: vars.text.primary,
  letterSpacing: vars.typography.letterSpacing.tight,
});

globalStyle('h1', {
  fontSize: vars.typography.size['4xl'],
  fontWeight: vars.typography.weight.extrabold,
});

globalStyle('h2', {
  fontSize: vars.typography.size['3xl'],
  fontWeight: vars.typography.weight.bold,
});

globalStyle('h3', {
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
});

globalStyle('h4', {
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
});

globalStyle('h5', {
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.medium,
});

globalStyle('h6', {
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.medium,
});

globalStyle('p', {
  marginBottom: vars.spacing.md,
  lineHeight: vars.typography.lineHeight.relaxed,
  color: vars.text.secondary,
});

globalStyle('a', {
  color: vars.text.link,
  textDecoration: 'none',
  transition: `all ${vars.transitions.fast} ${vars.animations.easing.smooth}`,
  position: 'relative',
});

globalStyle('a:hover', {
  color: vars.text.linkHover,
  transform: 'translateY(-1px)',
});

globalStyle('a:focus', {
  outline: 'none',
  boxShadow: vars.shadows.focus,
  borderRadius: vars.border.radius.sm,
});

globalStyle('button, input, textarea, select', {
  fontFamily: vars.typography.family.sans,
  fontSize: vars.typography.size.base,
  lineHeight: vars.typography.lineHeight.normal,
});

globalStyle('img', {
  maxWidth: '100%',
  height: 'auto',
  display: 'block',
  borderRadius: vars.border.radius.md,
});

globalStyle('::selection', {
  backgroundColor: vars.colors.primary['200'],
  color: vars.colors.primary['900'],
});

globalStyle('::-moz-selection', {
  backgroundColor: vars.colors.primary['200'],
  color: vars.colors.primary['900'],
});

globalStyle('::-webkit-scrollbar', {
  width: '8px',
  height: '8px',
});

globalStyle('::-webkit-scrollbar-track', {
  background: vars.background.secondary,
  borderRadius: vars.border.radius.full,
});

globalStyle('::-webkit-scrollbar-thumb', {
  background: vars.colors.neutral['400'],
  borderRadius: vars.border.radius.full,
  transition: `background ${vars.transitions.fast}`,
});

globalStyle('::-webkit-scrollbar-thumb:hover', {
  background: vars.colors.neutral['500'],
});

globalStyle('*:focus-visible', {
  outline: `2px solid ${vars.colors.primary['500']}`,
  outlineOffset: '2px',
  borderRadius: vars.border.radius.sm,
});

globalStyle('button:focus-visible', {
  boxShadow: vars.shadows.focusPrimary,
});

globalStyle('ul, ol', {
  marginBottom: vars.spacing.md,
  paddingLeft: vars.spacing.lg,
});

globalStyle('li', {
  marginBottom: vars.spacing.xs,
  lineHeight: vars.typography.lineHeight.relaxed,
});

globalStyle('blockquote', {
  borderLeft: `4px solid ${vars.colors.primary['500']}`,
  paddingLeft: vars.spacing.md,
  margin: `${vars.spacing.lg} 0`,
  fontStyle: 'italic',
  color: vars.text.secondary,
});

globalStyle('code', {
  fontFamily: vars.typography.family.mono,
  backgroundColor: vars.background.secondary,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  borderRadius: vars.border.radius.sm,
  fontSize: '0.875em',
  color: vars.text.primary,
});

globalStyle('pre', {
  backgroundColor: vars.background.secondary,
  padding: vars.spacing.md,
  borderRadius: vars.border.radius.md,
  overflowX: 'auto',
  margin: `${vars.spacing.lg} 0`,
});

globalStyle('pre code', {
  background: 'none',
  padding: 0,
});

globalStyle('table', {
  width: '100%',
  borderCollapse: 'collapse',
  margin: `${vars.spacing.lg} 0`,
});

globalStyle('th, td', {
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  textAlign: 'left',
  borderBottom: `1px solid ${vars.border.color.tertiary}`,
});

globalStyle('th', {
  fontWeight: vars.typography.weight.semibold,
  backgroundColor: vars.background.secondary,
});

globalStyle('hr', {
  border: 'none',
  height: '1px',
  backgroundColor: vars.border.color.tertiary,
  margin: `${vars.spacing.lg} 0`,
});
