import { style } from '@vanilla-extract/css';

import { media, vars } from '@adopt-dont-shop/lib.components/theme';

// Layout shared by the static info pages (/about, /contact). Vertical padding is
// set per side so the Container keeps its horizontal gutters.
export const page = style({
  paddingTop: vars.spacing['6'],
  paddingBottom: vars.spacing['7'],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['6'],
  '@media': {
    [media.down('md')]: {
      paddingTop: vars.spacing['5'],
      gap: vars.spacing['5'],
    },
  },
});

export const lead = style({
  maxWidth: '65ch',
  fontSize: vars.typography.size.lg,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const cardGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
  gap: vars.spacing['4'],
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: vars.spacing['5'],
  background: vars.background.surface,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.xl,
  boxShadow: vars.shadows.sm,
});

export const iconBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: vars.spacing['6'],
  height: vars.spacing['6'],
  marginBottom: vars.spacing['1'],
  borderRadius: vars.border.radius.pill,
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primary,
  fontSize: vars.typography.size['2xl'],
});

export const cardTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.snug,
  color: vars.text.primary,
});

export const cardText = style({
  margin: 0,
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const bodyText = style({
  maxWidth: '65ch',
  margin: 0,
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const link = style({
  color: vars.text.link,
  fontWeight: vars.typography.weight.medium,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  overflowWrap: 'anywhere',
  selectors: {
    '&:hover': { color: vars.text.linkHover },
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
      borderRadius: vars.border.radius.sm,
    },
  },
});

export const callout = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['4'],
  padding: vars.spacing['5'],
  background: vars.colors.primaryBgSubtle,
  border: `${vars.border.width.thin} solid ${vars.colors.primaryBorderSubtle}`,
  borderRadius: vars.border.radius.xl,
});

export const calloutTitle = style({
  margin: 0,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const calloutText = style({
  margin: `${vars.spacing['1']} 0 0`,
  color: vars.text.secondary,
});

export const actions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
});

// Router links styled as buttons: the shared Button renders a <button>, and
// nesting one inside a link is invalid interactive content.
const linkButtonBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.lg,
  border: `${vars.border.width.thin} solid transparent`,
  fontWeight: vars.typography.weight.semibold,
  textDecoration: 'none',
  transition: `background-color ${vars.transitions.fast}, border-color ${vars.transitions.fast}`,
  selectors: {
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': { transition: 'none' },
  },
});

export const primaryLinkButton = style([
  linkButtonBase,
  {
    background: vars.colors.primary,
    color: vars.text.inverse,
    selectors: {
      // Restate the colour: the global `a:hover` rule would otherwise recolour the label.
      '&:hover': { background: vars.colors.primaryHover, color: vars.text.inverse },
    },
  },
]);

export const outlineLinkButton = style([
  linkButtonBase,
  {
    background: vars.background.surface,
    borderColor: vars.border.color.strong,
    color: vars.text.primary,
    selectors: {
      '&:hover': { borderColor: vars.colors.primary, color: vars.text.primary },
    },
  },
]);
