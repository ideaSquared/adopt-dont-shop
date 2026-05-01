import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {},
  variants: {
    fullWidth: {
      true: { display: 'block', width: '100%' },
      false: { display: 'inline-block', width: 'auto' },
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

export const label = style({
  display: 'block',
  marginBottom: vars.spacing.xs,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.colors.neutral['700'],
});

export const labelRequired = style({
  selectors: {
    '&::after': {
      content: '" *"',
      color: vars.colors.semantic.error['500'],
    },
  },
});

export const textAreaWrapper = style({
  position: 'relative',
});

export const textArea = recipe({
  base: {
    width: '100%',
    border: 'none',
    outline: 'none',
    transition: `all ${vars.transitions.fast}`,
    color: vars.colors.neutral['900'],
    fontFamily: 'inherit',
    lineHeight: vars.typography.lineHeight.relaxed,
    selectors: {
      '&::placeholder': {
        color: vars.colors.neutral['400'],
      },
      '&:disabled': {
        backgroundColor: vars.colors.neutral['100'],
        color: vars.colors.neutral['400'],
        cursor: 'not-allowed',
        resize: 'none',
      },
      '&:read-only': {
        resize: 'none',
      },
    },
  },
  variants: {
    size: {
      sm: {
        minHeight: '80px',
        padding: '8px 12px',
        fontSize: '14px',
      },
      md: {
        minHeight: '100px',
        padding: '12px 16px',
        fontSize: '16px',
      },
      lg: {
        minHeight: '120px',
        padding: '16px 20px',
        fontSize: '18px',
      },
    },
    variant: {
      default: {
        border: `1px solid ${vars.colors.neutral['300']}`,
        backgroundColor: vars.colors.neutral['50'],
        borderRadius: vars.spacing.xs,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.primary['500'],
            boxShadow: `0 0 0 3px ${vars.colors.primary['100']}40`,
          },
        },
      },
      filled: {
        border: '1px solid transparent',
        backgroundColor: vars.colors.neutral['100'],
        borderRadius: vars.spacing.xs,
        selectors: {
          '&:focus': {
            backgroundColor: vars.colors.neutral['50'],
            borderColor: vars.colors.primary['500'],
            boxShadow: `0 0 0 3px ${vars.colors.primary['100']}40`,
          },
        },
      },
      underlined: {
        border: 'none',
        borderBottom: `2px solid ${vars.colors.neutral['300']}`,
        backgroundColor: 'transparent',
        borderRadius: '0',
        paddingLeft: '0',
        paddingRight: '0',
        selectors: {
          '&:focus': {
            borderBottomColor: vars.colors.primary['500'],
            boxShadow: 'none',
          },
        },
      },
    },
    state: {
      default: {},
      error: {
        borderColor: vars.colors.semantic.error['500'],
        selectors: {
          '&:focus': {
            borderColor: vars.colors.semantic.error['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.error['100']}40`,
          },
        },
      },
      success: {
        borderColor: vars.colors.semantic.success['500'],
        selectors: {
          '&:focus': {
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.success['100']}40`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.semantic.warning['500'],
        selectors: {
          '&:focus': {
            borderColor: vars.colors.semantic.warning['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.warning['100']}40`,
          },
        },
      },
    },
    autoResize: {
      true: { resize: 'none' },
      false: { resize: 'vertical' },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
    state: 'default',
    autoResize: false,
  },
});

export const footerContainer = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginTop: vars.spacing.xs,
  gap: vars.spacing.sm,
});

export const helperText = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    lineHeight: vars.typography.lineHeight.normal,
    flex: 1,
  },
  variants: {
    state: {
      default: { color: vars.colors.neutral['600'] },
      error: { color: vars.colors.semantic.error['500'] },
      success: { color: vars.colors.semantic.success['500'] },
      warning: { color: vars.colors.semantic.warning['500'] },
    },
  },
  defaultVariants: {
    state: 'default',
  },
});

export const characterCount = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  variants: {
    isOverLimit: {
      true: { color: vars.colors.semantic.error['500'] },
      false: { color: vars.colors.neutral['500'] },
    },
  },
  defaultVariants: {
    isOverLimit: false,
  },
});
