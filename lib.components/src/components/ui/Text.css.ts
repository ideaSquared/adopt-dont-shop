import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

export const base = style({
  fontFamily: vars.typography.family.sans,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const variants = styleVariants({
  body: {
    fontSize: vars.typography.size.base,
    fontWeight: vars.typography.weight.normal,
  },
  caption: {
    fontSize: vars.typography.size.xs,
    fontWeight: vars.typography.weight.normal,
    color: vars.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  small: {
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.normal,
  },
  lead: {
    fontSize: vars.typography.size.lg,
    fontWeight: vars.typography.weight.normal,
    lineHeight: '1.6',
  },
  muted: {
    color: vars.text.tertiary,
  },
  highlight: {
    color: vars.text.primary,
    fontWeight: vars.typography.weight.medium,
  },
});

export const sizes = styleVariants({
  xs: { fontSize: vars.typography.size.xs },
  sm: { fontSize: vars.typography.size.sm },
  base: { fontSize: vars.typography.size.base },
  lg: { fontSize: vars.typography.size.lg },
  xl: { fontSize: vars.typography.size.xl },
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
  muted: { color: vars.text.tertiary },
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

export const truncate = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const italic = style({ fontStyle: 'italic' });

export const underline = style({ textDecoration: 'underline' });
