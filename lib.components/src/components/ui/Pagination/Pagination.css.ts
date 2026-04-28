import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.xs,
});

const buttonBase = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: vars.border.radius.sm,
  fontWeight: vars.typography.weight.medium,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  textDecoration: 'none',
  selectors: {
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
    '&:focus': { outline: `2px solid ${vars.colors.primary['500']}`, outlineOffset: '2px' },
  },
});
globalStyle(`${buttonBase} svg`, { width: '16px', height: '16px' });

export const button = recipe({
  base: buttonBase,
  variants: {
    size: {
      sm: {
        height: '32px',
        minWidth: '32px',
        padding: '0 8px',
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: '40px',
        minWidth: '40px',
        padding: '0 12px',
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: '48px',
        minWidth: '48px',
        padding: '0 16px',
        fontSize: vars.typography.size.lg,
      },
    },
    variant: {
      default: {},
      outlined: {},
      minimal: {},
    },
    isActive: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    // default + inactive
    {
      variants: { variant: 'default', isActive: false },
      style: {
        backgroundColor: vars.colors.neutral['50'],
        border: `1px solid ${vars.colors.neutral['300']}`,
        color: vars.colors.neutral['700'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.neutral['50'],
            borderColor: vars.colors.neutral['400'],
          },
        },
      },
    },
    // default + active
    {
      variants: { variant: 'default', isActive: true },
      style: {
        backgroundColor: vars.colors.primary['500'],
        border: `1px solid ${vars.colors.primary['500']}`,
        color: vars.colors.neutral['50'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.primary['700'],
            borderColor: vars.colors.primary['700'],
          },
        },
      },
    },
    // outlined + inactive
    {
      variants: { variant: 'outlined', isActive: false },
      style: {
        backgroundColor: 'transparent',
        border: `1px solid ${vars.colors.neutral['300']}`,
        color: vars.colors.neutral['700'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.neutral['50'],
            borderColor: vars.colors.primary['500'],
            color: vars.colors.primary['500'],
          },
        },
      },
    },
    // outlined + active
    {
      variants: { variant: 'outlined', isActive: true },
      style: {
        backgroundColor: 'transparent',
        border: `1px solid ${vars.colors.primary['500']}`,
        color: vars.colors.primary['500'],
        selectors: {
          '&:hover:not(:disabled)': {
            borderColor: vars.colors.primary['500'],
            color: vars.colors.primary['500'],
          },
        },
      },
    },
    // minimal + inactive
    {
      variants: { variant: 'minimal', isActive: false },
      style: {
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        color: vars.colors.neutral['600'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.neutral['100'],
            color: vars.colors.neutral['700'],
          },
        },
      },
    },
    // minimal + active
    {
      variants: { variant: 'minimal', isActive: true },
      style: {
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        color: vars.colors.primary['500'],
        fontWeight: vars.typography.weight.semibold,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.neutral['100'],
            color: vars.colors.neutral['700'],
          },
        },
      },
    },
  ],
  defaultVariants: {
    size: 'md',
    variant: 'default',
    isActive: false,
  },
});

export const ellipsis = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: vars.colors.neutral['500'],
  },
  variants: {
    size: {
      sm: {
        height: '32px',
        minWidth: '32px',
        padding: '0 8px',
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: '40px',
        minWidth: '40px',
        padding: '0 12px',
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: '48px',
        minWidth: '48px',
        padding: '0 16px',
        fontSize: vars.typography.size.lg,
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});
