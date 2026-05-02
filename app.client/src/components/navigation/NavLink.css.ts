import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const styledLink = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
    borderRadius: vars.border.radius.md,
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: vars.typography.size.sm,
    transition: `background ${vars.transitions.fast}`,
    position: 'relative',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.12)',
    },
    ':focus-visible': {
      outline: '2px solid rgba(255, 255, 255, 0.8)',
      outlineOffset: '2px',
    },
  },
  variants: {
    active: {
      true: {
        background: 'rgba(255, 255, 255, 0.18)',
      },
      false: {},
    },
    primary: {
      true: {
        background: 'rgba(255, 255, 255, 0.15)',
        fontWeight: 600,
      },
      false: {},
    },
    iconOnly: {
      true: {
        padding: vars.spacing['2'],
      },
      false: {
        padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
      },
    },
  },
  defaultVariants: { active: false, primary: false, iconOnly: false },
});

export const navIcon = style({
  fontSize: '1.25rem',
  display: 'inline-flex',
});
