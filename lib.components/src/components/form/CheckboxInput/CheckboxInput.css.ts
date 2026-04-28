import { recipe } from '@vanilla-extract/recipes';
import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = style({
  display: 'inline-flex',
  flexDirection: 'column',
  gap: vars.spacing.xs,
});

export const checkboxContainer = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing.sm,
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
    borderRadius: vars.border.radius.xs,
    backgroundColor: vars.colors.neutral['50'],
    transition: `all ${vars.transitions.fast}`,
    flexShrink: 0,
    marginTop: '2px',
    selectors: {
      [`${checkboxContainer}:hover input:not(:disabled) + &`]: {
        borderColor: vars.colors.primary['500'],
      },
    },
  },
  variants: {
    state: {
      default: {
        borderColor: vars.colors.neutral['300'],
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.primary['500'],
            boxShadow: `0 0 0 3px ${vars.colors.primary['100']}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.primary['500'],
            boxShadow: `0 0 0 3px ${vars.colors.primary['100']}40`,
          },
        },
      },
      error: {
        borderColor: vars.colors.semantic.error['500'],
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.semantic.error['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.error['100']}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.semantic.error['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.error['100']}40`,
          },
        },
      },
      success: {
        borderColor: vars.colors.semantic.success['500'],
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.success['100']}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.success['100']}40`,
          },
        },
      },
      warning: {
        borderColor: vars.colors.semantic.warning['500'],
        selectors: {
          'input:focus + &': {
            borderColor: vars.colors.semantic.warning['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.warning['100']}40`,
          },
          'input:focus-visible + &': {
            borderColor: vars.colors.semantic.warning['500'],
            boxShadow: `0 0 0 3px ${vars.colors.semantic.warning['100']}40`,
          },
        },
      },
    },
    checked: {
      true: {
        backgroundColor: vars.colors.primary['500'],
        borderColor: vars.colors.primary['500'],
      },
      false: {},
    },
    disabled: {
      true: {
        backgroundColor: vars.colors.neutral['100'],
        borderColor: vars.colors.neutral['200'],
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
  gap: vars.spacing.xs,
  flex: 1,
});

export const label = recipe({
  base: {
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    color: vars.colors.neutral['900'],
    cursor: 'pointer',
    lineHeight: vars.typography.lineHeight.normal,
  },
  variants: {
    disabled: {
      true: {
        color: vars.colors.neutral['400'],
        cursor: 'not-allowed',
      },
      false: {},
    },
    required: {
      true: {
        selectors: {
          '&::after': {
            content: '" *"',
            color: vars.colors.semantic.error['500'],
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
    color: vars.colors.neutral['600'],
    lineHeight: vars.typography.lineHeight.relaxed,
  },
  variants: {
    disabled: {
      true: { color: vars.colors.neutral['300'] },
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
    color: vars.colors.neutral['600'],
  },
  error: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.semantic.error['500'],
  },
  success: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.semantic.success['500'],
  },
  warning: {
    fontSize: vars.typography.size.xs,
    color: vars.colors.semantic.warning['500'],
  },
});
