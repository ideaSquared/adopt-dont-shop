import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

export const base = style({
  fontFamily: vars.typography.family.display,
  lineHeight: vars.typography.lineHeight.tight,
});

export const sizes = styleVariants({
  xs: { fontSize: vars.typography.size.sm },
  sm: { fontSize: vars.typography.size.base },
  md: { fontSize: vars.typography.size.lg },
  lg: { fontSize: vars.typography.size.xl },
  xl: { fontSize: vars.typography.size['2xl'] },
  '2xl': { fontSize: vars.typography.size['3xl'] },
  '3xl': { fontSize: vars.typography.size['4xl'] },
  '4xl': { fontSize: vars.typography.size['5xl'] },
});

export const weights = styleVariants({
  light: { fontWeight: vars.typography.weight.light },
  normal: { fontWeight: vars.typography.weight.normal },
  medium: { fontWeight: vars.typography.weight.medium },
  semibold: { fontWeight: vars.typography.weight.semibold },
  bold: { fontWeight: vars.typography.weight.bold },
});

export const colors = styleVariants({
  body: { color: vars.text.primary },
  dark: { color: vars.text.primary },
  light: { color: vars.text.inverse },
  muted: { color: vars.text.disabled },
  primary: { color: vars.text.primary },
  secondary: { color: vars.text.secondary },
  success: { color: vars.text.success },
  danger: { color: vars.text.error },
  warning: { color: vars.text.warning },
  info: { color: vars.text.info },
});

export const aligns = styleVariants({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
  justify: { textAlign: 'justify' },
});

// Level margins and noMargin all in one map so only one class is ever applied
export const margins = styleVariants({
  h1: { margin: `0 0 ${vars.spacing.xl} 0` },
  h2: { margin: `0 0 ${vars.spacing.lg} 0` },
  h3: { margin: `0 0 ${vars.spacing.md} 0` },
  h4: { margin: `0 0 ${vars.spacing.sm} 0` },
  h5: { margin: `0 0 ${vars.spacing.sm} 0` },
  h6: { margin: `0 0 ${vars.spacing.sm} 0` },
  none: { margin: 0 },
});

export const truncate = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
