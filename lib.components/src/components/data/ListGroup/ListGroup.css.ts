import { recipe } from '@vanilla-extract/recipes';
import { vars } from '../../../styles/theme.css';

export const listGroup = recipe({
  base: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    background: vars.background.secondary,
  },
  variants: {
    variant: {
      default: {
        border: `1px solid ${vars.border.color.primary}`,
        borderRadius: vars.border.radius.lg,
        overflow: 'hidden',
      },
      flush: {
        border: 'none',
        borderRadius: 0,
      },
      bordered: {
        border: `1px solid ${vars.border.color.primary}`,
        borderRadius: vars.border.radius.lg,
        overflow: 'hidden',
        selectors: {
          '& li': {
            borderBottom: `1px solid ${vars.border.color.primary}`,
          },
          '& li:last-child': {
            borderBottom: 'none',
          },
        },
      },
    },
    size: {
      sm: {
        selectors: {
          '& li': {
            padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
            fontSize: vars.typography.size.sm,
          },
        },
      },
      md: {
        selectors: {
          '& li': {
            padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
            fontSize: vars.typography.size.base,
          },
        },
      },
      lg: {
        selectors: {
          '& li': {
            padding: `${vars.spacing['4']} ${vars.spacing['5']}`,
            fontSize: vars.typography.size.lg,
          },
        },
      },
    },
  },
});

export const listGroupItem = recipe({
  base: {
    color: vars.text.primary,
    lineHeight: vars.typography.lineHeight.relaxed,
    transition: vars.transitions.fast,
    wordBreak: 'break-word',
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  variants: {
    variant: {
      default: {},
      flush: {
        borderBottom: `1px solid ${vars.border.color.primary}`,
        selectors: {
          '&:last-child': {
            borderBottom: 'none',
          },
        },
      },
      bordered: {},
    },
    interactive: {
      true: {
        cursor: 'pointer',
        userSelect: 'none',
        selectors: {
          '&:hover': {
            background: vars.background.tertiary,
            color: vars.text.primary,
          },
          '&:active': {
            background: vars.colors.primary['50'],
            color: vars.colors.primary['700'],
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.tertiary,
            boxShadow: `inset 0 0 0 2px ${vars.colors.primary['500']}`,
          },
        },
      },
      false: {},
    },
  },
});
