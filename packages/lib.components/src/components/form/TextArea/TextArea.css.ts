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
  marginBottom: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.secondary,
});

export const labelRequired = style({
  selectors: {
    '&::after': {
      content: '" *"',
      color: vars.colors.danger,
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
    color: vars.text.primary,
    fontFamily: 'inherit',
    lineHeight: vars.typography.lineHeight.relaxed,
    selectors: {
      '&::placeholder': {
        color: vars.border.color.strong,
      },
      '&:disabled': {
        backgroundColor: vars.background.muted,
        color: vars.border.color.strong,
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
        border: `1px solid ${vars.border.color.default}`,
        backgroundColor: vars.background.body,
        borderRadius: vars.spacing['1'],
        selectors: {
          '&:focus': {
            borderColor: vars.colors.primary,
            boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
          },
        },
      },
      filled: {
        border: '1px solid transparent',
        backgroundColor: vars.background.muted,
        borderRadius: vars.spacing['1'],
        selectors: {
          '&:focus': {
            backgroundColor: vars.background.body,
            borderColor: vars.colors.primary,
            boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
          },
        },
      },
      underlined: {
        border: 'none',
        borderBottom: `2px solid ${vars.border.color.default}`,
        backgroundColor: 'transparent',
        borderRadius: '0',
        paddingLeft: '0',
        paddingRight: '0',
        selectors: {
          '&:focus': {
            borderBottomColor: vars.colors.primary,
            boxShadow: 'none',
          },
        },
      },
    },
    state: {
      default: {},
      error: {
        borderColor: vars.colors.danger,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.danger,
            boxShadow: `0 0 0 3px ${vars.colors.dangerBgSubtle}40`,
          },
        },
      },
      success: {
        borderColor: vars.colors.success,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.success,
            boxShadow: `0 0 0 3px ${vars.colors.successBgSubtle}40`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.warning,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.warning,
            boxShadow: `0 0 0 3px ${vars.colors.warningBgSubtle}40`,
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
  marginTop: vars.spacing['1'],
  gap: vars.spacing['2'],
});

export const helperText = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    lineHeight: vars.typography.lineHeight.normal,
    flex: 1,
  },
  variants: {
    state: {
      default: { color: vars.text.tertiary },
      error: { color: vars.colors.danger },
      success: { color: vars.colors.success },
      warning: { color: vars.colors.warning },
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
      true: { color: vars.colors.danger },
      false: { color: vars.text.muted },
    },
  },
  defaultVariants: {
    isOverLimit: false,
  },
});
