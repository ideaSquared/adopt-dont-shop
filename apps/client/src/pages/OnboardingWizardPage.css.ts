import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: `${vars.spacing['5']} ${vars.spacing['3']} ${vars.spacing['8']}`,
  background: `linear-gradient(135deg, ${vars.background.surface} 0%, ${vars.background.body} 100%)`,
});

export const card = style({
  width: '100%',
  maxWidth: '720px',
  padding: '2.5rem',
});

export const header = style({
  marginBottom: vars.spacing['5'],
  textAlign: 'center',
});

export const heroIcon = style({
  fontSize: vars.typography.size['5xl'],
  lineHeight: 1,
  marginBottom: '0.75rem',
  display: 'inline-block',
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
});

globalStyle(`${header} p`, {
  color: vars.text.tertiary,
  lineHeight: '1.6',
  fontSize: vars.typography.size.base,
  margin: 0,
});

export const stepper = style({
  marginBottom: vars.spacing['5'],
});

export const section = style({
  marginBottom: vars.spacing['5'],
});

globalStyle(`${section} h3`, {
  fontSize: '1.05rem',
  fontWeight: vars.typography.weight.semibold,
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
  gap: vars.spacing['2'],
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
  fontWeight: vars.typography.weight.semibold,
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
  borderRadius: vars.border.radius.lg,
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
  fontWeight: vars.typography.weight.semibold,
});

export const tileIcon = style({
  fontSize: '1.8rem',
  lineHeight: 1,
});

export const sliderField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  marginTop: vars.spacing['1'],
});

export const sliderHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: '0.9rem',
  color: vars.text.secondary,
});

export const sliderValue = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: vars.colors.primaryTextEmphasis,
});

export const slider = style({
  width: '100%',
  accentColor: vars.colors.primary,
  cursor: 'pointer',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  marginTop: vars.spacing['5'],
  paddingTop: vars.spacing['4'],
  borderTop: `1px solid ${vars.border.color.default}`,
});

export const alertWrap = style({
  marginBottom: vars.spacing['3'],
});

export const reviewSection = style({
  marginBottom: vars.spacing['4'],
  padding: vars.spacing['3'],
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  background: vars.background.surface,
});

globalStyle(`${reviewSection} h4`, {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: vars.spacing['3'],
  fontSize: '0.95rem',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
});

export const reviewItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.spacing['1']} 0`,
  fontSize: '0.9rem',
  color: vars.text.secondary,
});
