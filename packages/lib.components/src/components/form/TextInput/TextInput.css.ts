import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {
    display: 'inline-flex',
    flexDirection: 'column',
    gap: vars.spacing['1'],
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
      color: vars.colors.danger,
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
        height: vars.spacing['5'],
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['2'],
        paddingRight: vars.spacing['2'],
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: vars.spacing['5'],
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['2'],
        paddingRight: vars.spacing['2'],
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: vars.spacing['6'],
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
        fontSize: vars.typography.size.lg,
      },
    },
    variant: {
      default: {
        background: vars.background.surface,
        border: `1px solid ${vars.border.color.default}`,
        borderRadius: vars.border.radius.lg,
      },
      filled: {
        background: vars.background.muted,
        border: '1px solid transparent',
        borderRadius: vars.border.radius.lg,
      },
      underlined: {
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${vars.border.color.default}`,
        borderRadius: '0',
        paddingLeft: '0',
        paddingRight: '0',
      },
    },
    state: {
      default: {
        borderColor: vars.border.color.default,
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.border.color.muted,
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.primary,
            boxShadow: vars.shadows.focus,
          },
        },
      },
      error: {
        borderColor: vars.colors.dangerBorderSubtle,
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.danger,
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.danger,
            boxShadow: vars.shadows.focusDanger,
          },
        },
      },
      success: {
        borderColor: vars.colors.successBorderSubtle,
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.success,
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.success,
            boxShadow: vars.shadows.focus,
          },
        },
      },
      warning: {
        borderColor: vars.colors.warningBorderSubtle,
        selectors: {
          '&:hover:not(:has(input:disabled))': {
            borderColor: vars.colors.warning,
          },
          '&:focus-within': {
            outline: 'none',
            borderColor: vars.colors.warning,
            boxShadow: vars.shadows.focus,
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
        color: vars.text.muted,
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
      style: { paddingLeft: vars.spacing['5'] },
    },
    {
      variants: { hasLeftIcon: true, size: 'md' },
      style: { paddingLeft: vars.spacing['5'] },
    },
    {
      variants: { hasLeftIcon: true, size: 'lg' },
      style: { paddingLeft: vars.spacing['6'] },
    },
    {
      variants: { hasRightIcon: true, size: 'sm' },
      style: { paddingRight: vars.spacing['5'] },
    },
    {
      variants: { hasRightIcon: true, size: 'md' },
      style: { paddingRight: vars.spacing['5'] },
    },
    {
      variants: { hasRightIcon: true, size: 'lg' },
      style: { paddingRight: vars.spacing['6'] },
    },
  ],
  defaultVariants: {
    hasLeftIcon: false,
    hasRightIcon: false,
    size: 'md',
  },
});

const iconSizeSm = style({});
const iconSizeMd = style({});
const iconSizeLg = style({});
globalStyle(`${iconSizeSm} svg`, { width: '16px', height: '16px' });
globalStyle(`${iconSizeMd} svg`, { width: '18px', height: '18px' });
globalStyle(`${iconSizeLg} svg`, { width: '20px', height: '20px' });

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
      sm: iconSizeSm,
      md: iconSizeMd,
      lg: iconSizeLg,
    },
  },
  compoundVariants: [
    {
      variants: { position: 'left', size: 'sm' },
      style: { left: vars.spacing['2'] },
    },
    {
      variants: { position: 'left', size: 'md' },
      style: { left: vars.spacing['2'] },
    },
    {
      variants: { position: 'left', size: 'lg' },
      style: { left: vars.spacing['3'] },
    },
    {
      variants: { position: 'right', size: 'sm' },
      style: { right: vars.spacing['2'] },
    },
    {
      variants: { position: 'right', size: 'md' },
      style: { right: vars.spacing['2'] },
    },
    {
      variants: { position: 'right', size: 'lg' },
      style: { right: vars.spacing['3'] },
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
    background: vars.background.muted,
    border: `1px solid ${vars.border.color.default}`,
    color: vars.text.secondary,
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    whiteSpace: 'nowrap',
    paddingLeft: vars.spacing['2'],
    paddingRight: vars.spacing['2'],
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
        height: vars.spacing['5'],
        fontSize: vars.typography.size.sm,
      },
      md: {
        height: vars.spacing['5'],
        fontSize: vars.typography.size.base,
      },
      lg: {
        height: vars.spacing['6'],
        fontSize: vars.typography.size.lg,
      },
    },
    variant: {
      default: {},
      filled: {},
      underlined: {
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${vars.border.color.default}`,
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
      error: { color: vars.colors.dangerHover },
      success: { color: vars.colors.successHover },
      warning: { color: vars.colors.warningHover },
    },
  },
  defaultVariants: {
    state: 'default',
  },
});
