import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: vars.spacing['1.5'],
  },
  variants: {
    fullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

export const label = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
  lineHeight: vars.typography.lineHeight.tight,
});

export const labelDisabled = style({
  color: vars.text.disabled,
});

export const labelRequired = style({
  selectors: {
    '&::after': {
      content: '" *"',
      color: vars.colors.semantic.error['500'],
    },
  },
});

export const addonGroup = style({
  display: 'flex',
  alignItems: 'stretch',
  width: '100%',
});

export const inputWrapper = recipe({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    transition: `all ${vars.transitions.fast}`,
  },
  variants: {
    size: {
      sm: {
        height: vars.spacing['8'],
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: vars.spacing['10'],
        paddingTop: vars.spacing['2.5'],
        paddingBottom: vars.spacing['2.5'],
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: vars.spacing['12'],
        paddingTop: vars.spacing['3'],
        paddingBottom: vars.spacing['3'],
        paddingLeft: vars.spacing['4'],
        paddingRight: vars.spacing['4'],
        fontSize: vars.typography.size.lg,
      },
    },
    variant: {
      default: {
        background: vars.background.secondary,
        border: `1px solid ${vars.border.color.primary}`,
        borderRadius: vars.border.radius.lg,
      },
      filled: {
        background: vars.background.tertiary,
        border: '1px solid transparent',
        borderRadius: vars.border.radius.lg,
      },
      underlined: {
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${vars.border.color.primary}`,
        borderRadius: '0',
        paddingLeft: '0',
        paddingRight: '0',
      },
    },
    state: {
      default: {
        borderColor: vars.border.color.primary,
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.border.color.secondary,
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.primary['500'],
            boxShadow: vars.shadows.focusPrimary,
          },
        },
      },
      error: {
        borderColor: vars.colors.semantic.error['300'],
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.semantic.error['400'],
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.semantic.error['500'],
            boxShadow: vars.shadows.focusError,
          },
        },
      },
      success: {
        borderColor: vars.colors.semantic.success['300'],
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.semantic.success['400'],
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: vars.shadows.focusSuccess,
          },
        },
      },
      warning: {
        borderColor: vars.colors.semantic.warning['300'],
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.semantic.warning['400'],
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.semantic.warning['500'],
            boxShadow: vars.shadows.focusWarning,
          },
        },
      },
    },
    disabled: {
      true: {
        opacity: 0.6,
        cursor: 'not-allowed',
        background: vars.background.disabled,
      },
      false: {},
    },
    hasLeftAddon: {
      true: {
        borderTopLeftRadius: '0',
        borderBottomLeftRadius: '0',
        borderLeft: 'none',
      },
      false: {},
    },
    hasRightAddon: {
      true: {
        borderTopRightRadius: '0',
        borderBottomRightRadius: '0',
        borderRight: 'none',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      variants: { hasLeftAddon: true, hasRightAddon: true },
      style: { borderRadius: '0' },
    },
  ],
  defaultVariants: {
    size: 'md',
    variant: 'default',
    state: 'default',
    disabled: false,
    hasLeftAddon: false,
    hasRightAddon: false,
  },
});

export const input = recipe({
  base: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: vars.text.primary,
    fontFamily: vars.typography.family.sans,
    fontSize: 'inherit',
    lineHeight: vars.typography.lineHeight.normal,
    selectors: {
      '&::placeholder': {
        color: vars.text.quaternary,
      },
      '&:disabled': {
        cursor: 'not-allowed',
        color: vars.text.disabled,
      },
    },
  },
  variants: {
    hasLeftIcon: {
      true: {},
      false: {},
    },
    hasRightIcon: {
      true: {},
      false: {},
    },
    size: {
      sm: {},
      md: {},
      lg: {},
    },
  },
  compoundVariants: [
    {
      variants: { hasLeftIcon: true, size: 'sm' },
      style: { paddingLeft: vars.spacing['8'] },
    },
    {
      variants: { hasLeftIcon: true, size: 'md' },
      style: { paddingLeft: vars.spacing['10'] },
    },
    {
      variants: { hasLeftIcon: true, size: 'lg' },
      style: { paddingLeft: vars.spacing['12'] },
    },
    {
      variants: { hasRightIcon: true, size: 'sm' },
      style: { paddingRight: vars.spacing['8'] },
    },
    {
      variants: { hasRightIcon: true, size: 'md' },
      style: { paddingRight: vars.spacing['10'] },
    },
    {
      variants: { hasRightIcon: true, size: 'lg' },
      style: { paddingRight: vars.spacing['12'] },
    },
  ],
  defaultVariants: {
    hasLeftIcon: false,
    hasRightIcon: false,
    size: 'md',
  },
});

export const iconContainer = recipe({
  base: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: vars.text.tertiary,
    pointerEvents: 'none',
    zIndex: 1,
  },
  variants: {
    position: {
      left: {},
      right: {},
    },
    size: {
      sm: {
        selectors: {
          '& svg': { width: '16px', height: '16px' },
        },
      },
      md: {
        selectors: {
          '& svg': { width: '18px', height: '18px' },
        },
      },
      lg: {
        selectors: {
          '& svg': { width: '20px', height: '20px' },
        },
      },
    },
  },
  compoundVariants: [
    {
      variants: { position: 'left', size: 'sm' },
      style: { left: vars.spacing['3'] },
    },
    {
      variants: { position: 'left', size: 'md' },
      style: { left: vars.spacing['3'] },
    },
    {
      variants: { position: 'left', size: 'lg' },
      style: { left: vars.spacing['4'] },
    },
    {
      variants: { position: 'right', size: 'sm' },
      style: { right: vars.spacing['3'] },
    },
    {
      variants: { position: 'right', size: 'md' },
      style: { right: vars.spacing['3'] },
    },
    {
      variants: { position: 'right', size: 'lg' },
      style: { right: vars.spacing['4'] },
    },
  ],
  defaultVariants: {
    position: 'left',
    size: 'md',
  },
});

export const addon = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: vars.background.tertiary,
    border: `1px solid ${vars.border.color.primary}`,
    color: vars.text.secondary,
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    whiteSpace: 'nowrap',
    paddingLeft: vars.spacing['3'],
    paddingRight: vars.spacing['3'],
  },
  variants: {
    position: {
      left: {
        borderTopLeftRadius: vars.border.radius.lg,
        borderBottomLeftRadius: vars.border.radius.lg,
        borderRight: 'none',
      },
      right: {
        borderTopRightRadius: vars.border.radius.lg,
        borderBottomRightRadius: vars.border.radius.lg,
        borderLeft: 'none',
      },
    },
    size: {
      sm: {
        height: vars.spacing['8'],
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: vars.spacing['10'],
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: vars.spacing['12'],
        fontSize: vars.typography.size.lg,
      },
    },
    variant: {
      default: {},
      filled: {},
      underlined: {
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${vars.border.color.primary}`,
        borderRadius: '0',
      },
    },
  },
  defaultVariants: {
    position: 'left',
    size: 'md',
    variant: 'default',
  },
});

export const helperText = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    lineHeight: vars.typography.lineHeight.relaxed,
  },
  variants: {
    state: {
      default: { color: vars.text.tertiary },
      error: { color: vars.colors.semantic.error['600'] },
      success: { color: vars.colors.semantic.success['600'] },
      warning: { color: vars.colors.semantic.warning['600'] },
    },
  },
  defaultVariants: {
    state: 'default',
  },
});
