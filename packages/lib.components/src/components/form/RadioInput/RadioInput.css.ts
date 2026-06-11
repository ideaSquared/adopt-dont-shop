import { recipe } from '@vanilla-extract/recipes';
import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const radioContainer = recipe({
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

export const groupLabel = recipe({
  base: {
    display: 'block',
    marginBottom: vars.spacing['1'],
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    color: vars.text.secondary,
  },
  variants: {
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
    required: false,
  },
});

export const radioGroup = styleVariants({
  horizontal: {
    display: 'flex',
    flexDirection: 'row',
    gap: vars.spacing['4'],
    flexWrap: 'wrap',
  },
  vertical: {
    display: 'flex',
    flexDirection: 'column',
    gap: vars.spacing['2'],
    flexWrap: 'wrap',
  },
});

export const radioOptionContainer = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['1'],
    cursor: 'pointer',
    opacity: 1,
  },
  variants: {
    disabled: {
      true: {
        cursor: 'not-allowed',
        opacity: 0.6,
      },
      false: {},
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

export const hiddenRadio = style({
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
});

export const styledRadioSizes = styleVariants({
  sm: { width: '16px', height: '16px' },
  md: { width: '20px', height: '20px' },
  lg: { width: '24px', height: '24px' },
});

export const styledRadio = recipe({
  base: {
    position: 'relative',
    border: '2px solid',
    borderRadius: '50%',
    transition: `all ${vars.transitions.fast}`,
    flexShrink: 0,
    selectors: {
      'input:focus + &': {
        boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
      },
      'input:focus-visible + &': {
        boxShadow: `0 0 0 3px ${vars.colors.primaryBgSubtle}40`,
      },
    },
  },
  variants: {
    state: {
      default: { borderColor: vars.border.color.default },
      error: { borderColor: vars.colors.danger },
      success: { borderColor: vars.colors.success },
      warning: { borderColor: vars.colors.warning },
    },
    checked: {
      true: {
        borderColor: vars.colors.primary,
        backgroundColor: vars.colors.primary,
        selectors: {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: vars.background.body,
          },
        },
      },
      false: {},
    },
    disabled: {
      true: {
        backgroundColor: vars.background.muted,
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

export const optionLabel = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  userSelect: 'none',
});

export const helperText = styleVariants({
  default: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.xs,
    color: vars.text.tertiary,
  },
  error: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.xs,
    color: vars.colors.danger,
  },
  success: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.xs,
    color: vars.colors.success,
  },
  warning: {
    marginTop: vars.spacing['1'],
    fontSize: vars.typography.size.xs,
    color: vars.colors.warning,
  },
});
