import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const group = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 380px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const tile = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '1.125rem 1rem',
  borderRadius: '0.75rem',
  border: '2px solid',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
  ':active': {
    transform: 'scale(0.98)',
  },
  ':focus-within': {
    outline: `2px solid ${vars.colors.primary}`,
    outlineOffset: '2px',
  },
});

export const tileVariants = styleVariants({
  yesSelected: {
    background: vars.colors.successBgSubtle,
    borderColor: vars.colors.success,
    ':hover': { background: vars.colors.successBgSubtle },
  },
  noSelected: {
    background: vars.background.muted,
    borderColor: vars.text.muted,
    ':hover': { background: vars.background.muted },
  },
  yesUnselected: {
    background: vars.background.body,
    borderColor: vars.border.color.default,
    ':hover': { background: vars.colors.successBgSubtle },
  },
  noUnselected: {
    background: vars.background.body,
    borderColor: vars.border.color.default,
    ':hover': { background: vars.background.muted },
  },
  yesError: {
    background: vars.background.body,
    borderColor: vars.colors.danger,
    ':hover': { background: vars.colors.successBgSubtle },
  },
  noError: {
    background: vars.background.body,
    borderColor: vars.colors.danger,
    ':hover': { background: vars.background.muted },
  },
});

export const hiddenRadio = style({
  position: 'absolute',
  opacity: '0' as unknown as number,
  pointerEvents: 'none',
  width: '0',
  height: '0',
});

export const emoji = style({
  fontSize: '1.75rem',
  lineHeight: '1',
});

export const label = style({
  fontSize: '0.9375rem',
});

export const labelVariants = styleVariants({
  yesSelected: { fontWeight: '600', color: vars.colors.successActive },
  noSelected: { fontWeight: '600', color: vars.text.secondary },
  unselected: { fontWeight: '500', color: vars.text.primary },
});
