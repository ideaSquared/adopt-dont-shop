import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const styledLink = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
    borderRadius: vars.border.radius.base,
    color: '#fff',
    textDecoration: 'none',
    fontWeight: vars.typography.weight.medium,
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
        fontWeight: vars.typography.weight.semibold,
      },
      false: {},
    },
    iconOnly: {
      true: {
        padding: vars.spacing['2'],
      },
      false: {
        padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
      },
    },
  },
  defaultVariants: { active: false, primary: false, iconOnly: false },
});

export const navIcon = style({
  fontSize: vars.typography.size.xl,
  display: 'inline-flex',
});

export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
});
