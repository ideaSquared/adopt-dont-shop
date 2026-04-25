import { recipe } from '@vanilla-extract/recipes';
import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

export const breadcrumbContainer = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontFamily: vars.typography.family.sans,
  },
  variants: {
    size: {
      sm: {
        fontSize: vars.typography.size.sm,
        gap: vars.spacing['1'],
      },
      md: {
        fontSize: vars.typography.size.base,
        gap: vars.spacing['2'],
      },
      lg: {
        fontSize: vars.typography.size.lg,
        gap: vars.spacing['3'],
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const breadcrumbList = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  gap: 'inherit',
});

export const breadcrumbItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 'inherit',
});

const interactiveBase = {
  textDecoration: 'none',
  transition: `all ${vars.transitions.fast}`,
  borderRadius: vars.border.radius.sm,
  padding: `${vars.spacing['1']} ${vars.spacing['1.5']}`,
  margin: `-${vars.spacing['1']} -${vars.spacing['1.5']}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
} as const;

export const breadcrumbLink = recipe({
  base: {
    ...interactiveBase,
    color: vars.text.secondary,
    fontWeight: vars.typography.weight.normal,
    cursor: 'pointer',
  },
  variants: {
    active: {
      true: {
        color: vars.text.primary,
        fontWeight: vars.typography.weight.semibold,
        cursor: 'default',
        pointerEvents: 'none',
      },
      false: {
        selectors: {
          '&:hover': {
            color: vars.text.primary,
            background: vars.background.tertiary,
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.tertiary,
            boxShadow: vars.shadows.focus,
          },
        },
      },
    },
    disabled: {
      true: {
        color: vars.text.disabled,
        cursor: 'not-allowed',
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
    disabled: false,
  },
});

export const breadcrumbButton = recipe({
  base: {
    ...interactiveBase,
    background: 'none',
    border: 'none',
    color: vars.text.secondary,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: vars.typography.weight.normal,
    cursor: 'pointer',
  },
  variants: {
    active: {
      true: {
        color: vars.text.primary,
        fontWeight: vars.typography.weight.semibold,
        cursor: 'default',
        pointerEvents: 'none',
      },
      false: {
        selectors: {
          '&:hover': {
            color: vars.text.primary,
            background: vars.background.tertiary,
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.tertiary,
            boxShadow: vars.shadows.focus,
          },
        },
      },
    },
    disabled: {
      true: {
        color: vars.text.disabled,
        cursor: 'not-allowed',
      },
      false: {},
    },
  },
  defaultVariants: {
    active: false,
    disabled: false,
  },
});

export const separator = style({
  color: vars.text.quaternary,
  userSelect: 'none',
  fontWeight: vars.typography.weight.normal,
});

export const collapsedIndicator = style({
  color: vars.text.quaternary,
  display: 'flex',
  alignItems: 'center',
  padding: vars.spacing['1'],
  cursor: 'default',
});

export const activeItemStyles = styleVariants({
  active: {
    fontWeight: vars.typography.weight.bold,
    cursor: 'default',
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
});
