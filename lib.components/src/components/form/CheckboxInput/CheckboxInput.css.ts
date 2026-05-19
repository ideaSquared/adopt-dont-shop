import { recipe } from '@vanilla-extract/recipes';
import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'inline-flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const checkboxContainer = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['2'],
  cursor: 'pointer',
});

export const hiddenCheckbox = style({
  position: 'absolute',
  opacity: 0,
  cursor: 'pointer',
  height: 0,
  width: 0,
});

export const styledCheckboxSizes = styleVariants({
  sm: { width: '16px', height: '16px' },
  md: { width: '20px', height: '20px' },
  lg: { width: '24px', height: '24px' },
});

export const styledCheckbox = recipe({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
    borderRadius: vars.border.radius.sm,
    backgroundColor: vars.background.body,
    transition: `all ${vars.transitions.fast}`,
    flexShrink: 0,
    marginTop: '2px',
    selectors: {
      [`${checkboxContainer}:hover input:not(:disabled) + &`]: {
        borderColor: vars.colors.primary,
      },
    },
  },
  variants: {
    state: {
      default: {
        borderColor: vars.border.color.default,
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.primary,
            boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.primary,
            boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
          },
        },
      },
      error: {
        borderColor: vars.colors.danger,
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.danger,
            boxShadow: `0 0 0 3px ${vars.colors.dangerBgSubtle}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.danger,
            boxShadow: `0 0 0 3px ${vars.colors.dangerBgSubtle}40`,
          },
        },
      },
      success: {
        borderColor: vars.colors.success,
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.success,
            boxShadow: `0 0 0 3px ${vars.colors.successBgSubtle}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.success,
            boxShadow: `0 0 0 3px ${vars.colors.successBgSubtle}40`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.warning,
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.warning,
            boxShadow: `0 0 0 3px ${vars.colors.warningBgSubtle}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.warning,
            boxShadow: `0 0 0 3px ${vars.colors.warningBgSubtle}40`,
          },
        },
      },
    },
    checked: {
      true: {
        backgroundColor: vars.colors.primary,
        borderColor: vars.colors.primary,
      },
      false: {},
    },
    disabled: {
      true: {
        backgroundColor: vars.background.muted,
        borderColor: vars.border.color.muted,
        cursor: 'not-allowed',
      },
      false: {},
    },
  },
  defaultVariants: {
    state: 'default',
    checked: false,
    disabled: false,
  },
});

export const checkIconSizes = styleVariants({
  sm: { fontSize: '10px' },
  md: { fontSize: '12px' },
  lg: { fontSize: '14px' },
});

export const checkIcon = recipe({
  base: {
    color: 'white',
    transition: `opacity ${vars.transitions.fast}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: vars.typography.weight.bold,
  },
  variants: {
    visible: {
      true: { opacity: 1 },
      false: { opacity: 0 },
    },
  },
  defaultVariants: {
    visible: false,
  },
});

export const labelContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  flex: 1,
});

export const label = recipe({
  base: {
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    color: vars.text.primary,
    cursor: 'pointer',
    lineHeight: vars.typography.lineHeight.normal,
  },
  variants: {
    disabled: {
      true: {
        color: vars.border.color.strong,
        cursor: 'not-allowed',
      },
      false: {},
    },
    required: {
      true: {
        selectors: {
          '&::after': {
            content: '" *"',
            color: vars.colors.danger,
          },
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    disabled: false,
    required: false,
  },
});

export const description = recipe({
  base: {
    margin: 0,
    fontSize: vars.typography.size.xs,
    color: vars.text.tertiary,
    lineHeight: vars.typography.lineHeight.relaxed,
  },
  variants: {
    disabled: {
      true: { color: vars.border.color.default },
      false: {},
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

export const helperText = styleVariants({
  default: {
    fontSize: vars.typography.size.xs,
    color: vars.text.tertiary,
  },
  error: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.danger,
  },
  success: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.success,
  },
  warning: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.warning,
  },
});
