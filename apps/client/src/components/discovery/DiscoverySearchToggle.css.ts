import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const toggle = style({
  display: 'inline-flex',
  gap: '0.25rem',
  padding: '0.25rem',
  borderRadius: vars.border.radius.pill,
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
});

export const option = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    // Meets the 44px minimum touch target (ADS-C4).
    minHeight: '44px',
    padding: '0 1rem',
    borderRadius: vars.border.radius.pill,
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    color: vars.text.secondary,
    selectors: {
      '&:focus-visible': {
        outline: `2px solid ${vars.colors.primary}`,
        outlineOffset: '2px',
      },
    },
  },
  variants: {
    active: {
      true: {
        background: vars.colors.primary,
        color: vars.text.inverse,
        cursor: 'default',
      },
      false: {
        selectors: {
          '&:hover': {
            color: vars.text.primary,
            background: vars.colors.primaryBgSubtle,
          },
        },
      },
    },
  },
});
