import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

// Plain inline-link styling so the button sits naturally next to text
// links like "Privacy" / "Terms" in a footer link row. No background,
// no border, font matches surrounding link styles.
export const link = style({
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: vars.text.secondary,
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      color: vars.text.primary,
      textDecoration: 'underline',
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.primaryHover}`,
      outlineOffset: '2px',
    },
  },
});
