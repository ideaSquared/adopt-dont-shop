import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

export const inputWrapper = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: vars.spacing.md,
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
  marginBottom: vars.spacing.xs,
  color: vars.text.primary,
});

export const requiredIndicator = style({
  color: vars.text.error,
  marginLeft: vars.spacing.xs,
});

export const inputContainer = style({
  position: 'relative',
  display: 'flex',
  width: '100%',
});

export const styledInput = recipe({
  base: {
    width: '100%',
    backgroundColor: vars.background.primary,
    color: vars.text.primary,
    border: `${vars.border.width.thin} solid`,
    borderRadius: vars.border.radius.md,
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
        borderColor: vars.border.color.secondary,
        selectors: {
          '&:focus': {
            borderColor: vars.colors.primary['500'],
            boxShadow: vars.shadows.focusPrimary,
          },
        },
      },
      success: {
        borderColor: vars.colors.semantic.success['500'],
        selectors: {
          '&:focus': {
            borderColor: vars.colors.semantic.success['500'],
            boxShadow: vars.shadows.focusSuccess,
          },
        },
      },
      error: {
        borderColor: vars.border.color.error,
        selectors: {
          '&:focus': { borderColor: vars.border.color.error, boxShadow: vars.shadows.focusError },
        },
      },
    },
    size: {
      sm: { padding: `${vars.spacing.xs} ${vars.spacing.sm}`, fontSize: vars.typography.size.sm },
      md: { padding: `${vars.spacing.sm} ${vars.spacing.md}`, fontSize: vars.typography.size.base },
      lg: { padding: `${vars.spacing.sm} ${vars.spacing.md}`, fontSize: vars.typography.size.lg },
    },
    hasStartIcon: {
      true: { paddingLeft: vars.spacing.xl },
      false: {},
    },
    hasEndIcon: {
      true: { paddingRight: vars.spacing.xl },
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

export const startIconWrapper = style([iconWrapper, { left: vars.spacing.sm }]);
export const endIconWrapper = style([iconWrapper, { right: vars.spacing.sm }]);

export const helperText = recipe({
  base: {
    fontSize: vars.typography.size.xs,
    marginTop: vars.spacing.xs,
  },
  variants: {
    hasError: {
      true: { color: vars.text.error },
      false: { color: vars.text.secondary },
    },
  },
  defaultVariants: { hasError: false },
});
