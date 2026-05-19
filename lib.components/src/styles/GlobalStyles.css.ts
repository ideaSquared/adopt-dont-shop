import { globalStyle } from '@vanilla-extract/css';

import { vars } from './theme.css';

// NOTE: Add Google Fonts to your app's index.html:
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Fredoka:wght@300..700&family=Playfair+Display:wght@400..900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

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
  backgroundColor: vars.background.body,
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
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
  letterSpacing: vars.typography.letterSpacing.tight,
});

globalStyle('h1', {
  fontSize: vars.typography.size['4xl'],
  // Fredoka tops out at 700 (bold). Avoid extrabold so the heading doesn't synth-bold or fall back to Inter mid-page.
  fontWeight: vars.typography.weight.bold,
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
  marginBottom: vars.spacing['2'],
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
  borderRadius: vars.border.radius.base,
});

globalStyle('::selection', {
  backgroundColor: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryTextEmphasis,
});

globalStyle('::-moz-selection', {
  backgroundColor: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryTextEmphasis,
});

globalStyle('::-webkit-scrollbar', {
  width: '8px',
  height: '8px',
});

globalStyle('::-webkit-scrollbar-track', {
  background: vars.background.surface,
  borderRadius: vars.border.radius.pill,
});

globalStyle('::-webkit-scrollbar-thumb', {
  background: vars.gray['400'],
  borderRadius: vars.border.radius.pill,
  transition: `background ${vars.transitions.fast}`,
});

globalStyle('::-webkit-scrollbar-thumb:hover', {
  background: vars.gray['500'],
});

globalStyle('*:focus-visible', {
  outline: `2px solid ${vars.colors.primary}`,
  outlineOffset: '2px',
  borderRadius: vars.border.radius.sm,
});

globalStyle('button:focus-visible', {
  boxShadow: vars.shadows.focus,
});

globalStyle('ul, ol', {
  marginBottom: vars.spacing['2'],
  paddingLeft: vars.spacing['2'],
});

globalStyle('li', {
  marginBottom: vars.spacing['1'],
  lineHeight: vars.typography.lineHeight.relaxed,
});

globalStyle('blockquote', {
  borderLeft: `4px solid ${vars.colors.primary}`,
  paddingLeft: vars.spacing['2'],
  margin: `${vars.spacing['2']} 0`,
  fontStyle: 'italic',
  color: vars.text.secondary,
});

globalStyle('code', {
  fontFamily: vars.typography.family.mono,
  backgroundColor: vars.background.muted,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.sm,
  fontSize: '0.875em',
  color: vars.text.primary,
});

globalStyle('pre', {
  backgroundColor: vars.background.muted,
  padding: vars.spacing['2'],
  borderRadius: vars.border.radius.base,
  overflowX: 'auto',
  margin: `${vars.spacing['2']} 0`,
});

globalStyle('pre code', {
  background: 'none',
  padding: 0,
});

globalStyle('table', {
  width: '100%',
  borderCollapse: 'collapse',
  margin: `${vars.spacing['2']} 0`,
});

globalStyle('th, td', {
  padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
  textAlign: 'left',
  borderBottom: `1px solid ${vars.border.color.muted}`,
});

globalStyle('th', {
  fontWeight: vars.typography.weight.semibold,
  backgroundColor: vars.background.muted,
});

globalStyle('hr', {
  border: 'none',
  height: '1px',
  backgroundColor: vars.border.color.muted,
  margin: `${vars.spacing['2']} 0`,
});
