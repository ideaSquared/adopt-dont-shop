import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
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
    '&:focus': { outline: `2px solid ${vars.colors.primary}`, outlineOffset: '2px' },
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
        backgroundColor: vars.background.body,
        border: `1px solid ${vars.border.color.default}`,
        color: vars.text.secondary,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.background.body,
            borderColor: vars.border.color.strong,
          },
        },
      },
    },
    // default + active
    {
      variants: { variant: 'default', isActive: true },
      style: {
        backgroundColor: vars.colors.primary,
        border: `1px solid ${vars.colors.primary}`,
        color: vars.background.body,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.primaryActive,
            borderColor: vars.colors.primaryActive,
          },
        },
      },
    },
    // outlined + inactive
    {
      variants: { variant: 'outlined', isActive: false },
      style: {
        backgroundColor: 'transparent',
        border: `1px solid ${vars.border.color.default}`,
        color: vars.text.secondary,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.background.body,
            borderColor: vars.colors.primary,
            color: vars.colors.primary,
          },
        },
      },
    },
    // outlined + active
    {
      variants: { variant: 'outlined', isActive: true },
      style: {
        backgroundColor: 'transparent',
        border: `1px solid ${vars.colors.primary}`,
        color: vars.colors.primary,
        selectors: {
          '&:hover:not(:disabled)': {
            borderColor: vars.colors.primary,
            color: vars.colors.primary,
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
        color: vars.text.tertiary,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.background.muted,
            color: vars.text.secondary,
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
        color: vars.colors.primary,
        fontWeight: vars.typography.weight.semibold,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.background.muted,
            color: vars.text.secondary,
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
    color: vars.text.muted,
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
