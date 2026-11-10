import { globalStyle, style } from '@vanilla-extract/css';

import { media, vars } from '@adopt-dont-shop/lib.components/theme';

export const page = style({});

export const cardTitle = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const configGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: vars.spacing['4'],
  // The 500px minimum overflows phones; drop to a single full-width column.
  '@media': {
    [media.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  },
});

export const sectionCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const infoBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: vars.spacing['3'],
  background: vars.colors.infoBgSubtle,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.sm,
  color: vars.colors.infoTextEmphasis,
  marginBottom: vars.spacing['3'],
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

globalStyle(`${infoBanner} a`, {
  color: vars.colors.infoHover,
  fontWeight: vars.typography.weight.semibold,
  textDecoration: 'none',
});

globalStyle(`${infoBanner} a:hover`, {
  textDecoration: 'underline',
});

export const settingItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: vars.spacing['3'],
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
});

export const settingLabel = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
});

export const settingValue = style({
  fontFamily: 'monospace',
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
  padding: vars.spacing['2'],
  background: vars.background.body,
  borderRadius: '6px',
});

export const statsigLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  color: vars.colors.infoHover,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  ':hover': {
    textDecoration: 'underline',
  },
});

export const inlineIcon = style({
  marginRight: vars.spacing['2'],
});

export const sectionIcon = style({
  display: 'inline',
  marginRight: vars.spacing['2'],
});
