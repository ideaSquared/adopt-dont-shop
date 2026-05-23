import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '2rem 1rem 6rem',
  background: `linear-gradient(135deg, ${vars.background.surface} 0%, ${vars.background.body} 100%)`,
});

export const card = style({
  width: '100%',
  maxWidth: '720px',
  padding: '2.5rem',
});

export const header = style({
  marginBottom: '2rem',
  textAlign: 'center',
});

export const heroIcon = style({
  fontSize: '3rem',
  lineHeight: 1,
  marginBottom: '0.75rem',
  display: 'inline-block',
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

globalStyle(`${header} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
  fontSize: '1rem',
  margin: 0,
});

export const section = style({
  marginBottom: '2rem',
});

globalStyle(`${section} h3`, {
  fontSize: '1.05rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  color: vars.text.primary,
});

globalStyle(`${section} p.hint`, {
  fontSize: '0.85rem',
  color: vars.text.tertiary,
  margin: '0 0 0.75rem',
});

export const chipGroup = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const chip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.55rem 0.95rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '999px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  background: vars.background.surface,
  color: vars.text.primary,
  userSelect: 'none',
  transition:
    'background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease',
  selectors: {
    '&:hover': {
      borderColor: vars.colors.primary,
      transform: 'translateY(-1px)',
    },
    '&:focus-within': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const chipIcon = style({
  fontSize: '1.1rem',
  lineHeight: 1,
});

export const chipSelected = style({
  background: vars.colors.primaryBgSubtle,
  borderColor: vars.colors.primary,
  color: vars.colors.primaryTextEmphasis,
  fontWeight: 600,
});

export const srInput = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

export const tileGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '0.6rem',
});

export const tile = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  padding: '1rem 0.75rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '0.75rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  background: vars.background.surface,
  color: vars.text.primary,
  userSelect: 'none',
  textAlign: 'center',
  transition: 'background 120ms ease, border-color 120ms ease, transform 120ms ease',
  selectors: {
    '&:hover': {
      borderColor: vars.colors.primary,
      transform: 'translateY(-1px)',
    },
    '&:focus-within': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});

export const tileSelected = style({
  background: vars.colors.primaryBgSubtle,
  borderColor: vars.colors.primary,
  color: vars.colors.primaryTextEmphasis,
  fontWeight: 600,
});

export const tileIcon = style({
  fontSize: '1.8rem',
  lineHeight: 1,
});

export const sliderField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  marginTop: '0.25rem',
});

export const sliderHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: '0.9rem',
  color: vars.text.secondary,
});

export const sliderValue = style({
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.colors.primaryTextEmphasis,
});

export const slider = style({
  width: '100%',
  accentColor: vars.colors.primary,
  cursor: 'pointer',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: `1px solid ${vars.border.color.default}`,
});

export const alertWrap = style({
  marginBottom: '1rem',
});
