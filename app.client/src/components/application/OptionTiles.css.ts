import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '0.75rem',
});

export const tile = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '1rem 0.75rem',
  borderRadius: '0.75rem',
  border: '2px solid',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
  minHeight: '92px',
  ':active': {
    transform: 'scale(0.98)',
  },
  ':focus-within': {
    outline: `2px solid ${vars.colors.primary['400']}`,
    outlineOffset: '2px',
  },
});

export const tileVariants = styleVariants({
  selected: {
    background: vars.colors.primary['50'],
    borderColor: vars.colors.primary['500'],
    ':hover': { background: vars.colors.primary['50'] },
  },
  unselected: {
    background: vars.background.primary,
    borderColor: vars.border.color.primary,
    ':hover': { background: vars.colors.primary['50'] },
  },
  error: {
    background: vars.background.primary,
    borderColor: vars.colors.semantic.error['400'],
    ':hover': { background: vars.colors.primary['50'] },
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
  fontSize: '1.5rem',
  lineHeight: '1',
});

export const label = style({
  fontSize: '0.8125rem',
  lineHeight: '1.25',
});

export const labelVariants = styleVariants({
  selected: { fontWeight: '600', color: vars.colors.primary['700'] },
  unselected: { fontWeight: '500', color: vars.text.primary },
});
