import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const section = style({
  marginBlock: vars.spacing['5'],
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: vars.spacing['3'],
});

globalStyle(`${header} h2`, {
  fontSize: '1.4rem',
  margin: 0,
  color: vars.text.primary,
});

export const seeAll = style({
  fontSize: '0.9rem',
  color: vars.colors.primary,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.semibold,
  selectors: {
    '&:hover': {
      textDecoration: 'underline',
    },
  },
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: vars.spacing['3'],
});

export const card = style({
  display: 'flex',
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  transition: 'transform 150ms ease, box-shadow 150ms ease',
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const imageWrap = style({
  position: 'relative',
  flex: '0 0 110px',
  background: vars.background.muted,
  overflow: 'hidden',
});

export const image = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const placeholder = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${vars.colors.primaryBgSubtle}, ${vars.background.muted})`,
  fontSize: '2rem',
});

export const body = style({
  flex: 1,
  padding: '0.75rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  minWidth: 0,
});

export const titleRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const name = style({
  fontSize: '1.05rem',
  fontWeight: vars.typography.weight.bold,
  margin: 0,
  color: vars.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const scoreChip = style({
  flexShrink: 0,
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
  padding: '0.15rem 0.55rem',
  borderRadius: '999px',
  fontSize: '0.7rem',
  fontWeight: vars.typography.weight.bold,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
});

export const meta = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const rescue = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const reasons = style({
  marginTop: vars.spacing['1'],
});
