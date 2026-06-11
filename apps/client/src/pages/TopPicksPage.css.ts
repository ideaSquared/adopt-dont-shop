import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '960px',
  margin: '0 auto',
  padding: '2rem 1rem 4rem',
});

export const header = style({
  marginBottom: '1.5rem',
});

globalStyle(`${header} h1`, {
  fontSize: '1.75rem',
  margin: '0 0 0.25rem',
  color: vars.text.primary,
});

globalStyle(`${header} p`, {
  margin: 0,
  color: vars.text.tertiary,
  fontSize: '0.95rem',
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1.25rem',
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: 0,
  cursor: 'pointer',
  transition: 'transform 150ms ease, box-shadow 150ms ease',
  selectors: {
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const imageWrap = style({
  position: 'relative',
  width: '100%',
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  background: vars.background.muted,
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
  fontSize: '3rem',
});

export const scoreBadge = style({
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  background: vars.colors.success,
  color: vars.text.inverse,
  padding: '0.35rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
});

export const body = style({
  padding: '1rem 1.1rem 1.1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  flex: 1,
});

export const name = style({
  fontSize: '1.25rem',
  fontWeight: 700,
  margin: 0,
  color: vars.text.primary,
  textDecoration: 'none',
});

export const meta = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem 0.6rem',
  fontSize: '0.85rem',
  color: vars.text.secondary,
  margin: 0,
});

export const metaDot = style({
  color: vars.text.tertiary,
});

export const rescue = style({
  fontSize: '0.8rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const reasons = style({
  marginTop: 'auto',
  paddingTop: '0.5rem',
});

export const emptyWrap = style({
  maxWidth: '520px',
  margin: '4rem auto',
  textAlign: 'center',
  padding: '2.5rem 2rem',
});

export const emptyIcon = style({
  fontSize: '3rem',
  marginBottom: '0.75rem',
});

globalStyle(`${emptyWrap} h2`, {
  margin: '0 0 0.5rem',
  color: vars.text.primary,
});

globalStyle(`${emptyWrap} p`, {
  color: vars.text.tertiary,
  marginBottom: '1.25rem',
});
