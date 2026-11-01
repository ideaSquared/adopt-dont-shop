import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';
import { control } from '../form/control.css';

export const inputWrapper = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: vars.spacing['3'],
  },
  variants: {
    isFullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
  },
  defaultVariants: { isFullWidth: true },
});

export const inputLabel = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  marginBottom: vars.spacing['1'],
  color: vars.text.primary,
});

export const requiredIndicator = style({
  color: vars.text.danger,
  marginLeft: vars.spacing['1'],
});

export const inputContainer = style({
  position: 'relative',
  display: 'flex',
  width: '100%',
});

export const styledInput = recipe({
  base: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: control.background,
    color: vars.text.primary,
    border: `${vars.border.width.thin} solid`,
    borderRadius: control.radius,
    outline: 'none',
    transition: `all ${vars.transitions.fast}`,
    fontFamily: vars.typography.family.sans,
    selectors: {
      '&:disabled': {
        backgroundColor: vars.background.disabled,
        cursor: 'not-allowed',
        opacity: 0.6,
      },
      '&::placeholder': { color: vars.text.secondary },
    },
  },
  variants: {
    variant: {
      default: {
        borderColor: control.borderColor,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.primary,
            boxShadow: control.focusRing,
          },
        },
      },
      success: {
        borderColor: vars.colors.success,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.success,
            boxShadow: vars.shadows.focus,
          },
        },
      },
      error: {
        borderColor: vars.border.color.danger,
        selectors: {
          '&:focus': { borderColor: vars.border.color.danger, boxShadow: vars.shadows.focusDanger },
        },
      },
    },
    size: {
      sm: {
        height: control.height.sm,
        padding: `0 ${control.paddingX}`,
        fontSize: control.fontSize.sm,
      },
      md: {
        height: control.height.md,
        padding: `0 ${control.paddingX}`,
        fontSize: control.fontSize.md,
      },
      lg: {
        height: control.height.lg,
        padding: `0 ${control.paddingX}`,
        fontSize: control.fontSize.lg,
      },
    },
    hasStartIcon: {
      true: { paddingLeft: vars.spacing['5'] },
      false: {},
    },
    hasEndIcon: {
      true: { paddingRight: vars.spacing['5'] },
      false: {},
    },
  },
  defaultVariants: { variant: 'default', size: 'md', hasStartIcon: false, hasEndIcon: false },
});

export const iconWrapper = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  color: vars.text.secondary,
});

export const startIconWrapper = style([iconWrapper, { left: vars.spacing['2'] }]);
export const endIconWrapper = style([iconWrapper, { right: vars.spacing['2'] }]);

export const helperText = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    marginTop: vars.spacing['1'],
  },
  variants: {
    hasError: {
      true: { color: vars.text.danger },
      false: { color: vars.text.secondary },
    },
  },
  defaultVariants: { hasError: false },
});
