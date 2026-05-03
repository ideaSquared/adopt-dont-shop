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
    outline: `2px solid ${vars.colors.primary['400']}`,
    outlineOffset: '2px',
  },
});

export const tileVariants = styleVariants({
  yesSelected: {
    background: vars.colors.semantic.success['50'],
    borderColor: vars.colors.semantic.success['500'],
    ':hover': { background: vars.colors.semantic.success['50'] },
  },
  noSelected: {
    background: vars.colors.neutral['100'],
    borderColor: vars.colors.neutral['500'],
    ':hover': { background: vars.colors.neutral['100'] },
  },
  yesUnselected: {
    background: vars.background.primary,
    borderColor: vars.border.color.primary,
    ':hover': { background: vars.colors.semantic.success['50'] },
  },
  noUnselected: {
    background: vars.background.primary,
    borderColor: vars.border.color.primary,
    ':hover': { background: vars.colors.neutral['100'] },
  },
  yesError: {
    background: vars.background.primary,
    borderColor: vars.colors.semantic.error['400'],
    ':hover': { background: vars.colors.semantic.success['50'] },
  },
  noError: {
    background: vars.background.primary,
    borderColor: vars.colors.semantic.error['400'],
    ':hover': { background: vars.colors.neutral['100'] },
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
  yesSelected: { fontWeight: '600', color: vars.colors.semantic.success['700'] },
  noSelected: { fontWeight: '600', color: vars.colors.neutral['700'] },
  unselected: { fontWeight: '500', color: vars.text.primary },
});
