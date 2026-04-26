import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

const spin = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' },
});

export const iconContainer = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});
globalStyle(`${iconContainer} svg`, { width: '1em', height: '1em' });

export const button = recipe({
  base: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: vars.typography.family.sans,
    borderRadius: vars.border.radius.lg,
    transition: `all ${vars.transitions.fast}`,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    userSelect: 'none',
    overflow: 'hidden',
    outline: 'none',
    lineHeight: '1',
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      pointerEvents: 'none',
      filter: 'grayscale(0.3)',
    },
    '@media': {
      '(max-width: 768px)': { minHeight: vars.spacing['11'] },
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
        selectors: { '&::after': { animation: 'none' }, '&::before': { animation: 'none' } },
      },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.colors.primary['500'],
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.primary['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.primary['600'],
            borderColor: vars.colors.primary['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.primary['700'],
            borderColor: vars.colors.primary['700'],
            transform: 'translateY(0)',
            boxShadow: vars.shadows.sm,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusPrimary,
          },
          '&:hover:not(:disabled)::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: `${shimmer} 2s ease-in-out`,
          },
        },
      },
      secondary: {
        background: vars.colors.secondary['500'],
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.secondary['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.secondary['600'],
            borderColor: vars.colors.secondary['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.secondary['700'],
            borderColor: vars.colors.secondary['700'],
            transform: 'translateY(0)',
            boxShadow: vars.shadows.sm,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${vars.colors.secondary['200']}`,
          },
          '&:hover:not(:disabled)::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: `${shimmer} 2s ease-in-out`,
          },
        },
      },
      outline: {
        background: 'transparent',
        color: vars.colors.primary['600'],
        border: `1px solid ${vars.border.color.primary}`,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.primary['50'],
            borderColor: vars.colors.primary['300'],
            color: vars.colors.primary['700'],
            transform: 'translateY(-1px)',
            boxShadow: vars.shadows.sm,
          },
          '&:active:not(:disabled)': {
            background: vars.colors.primary['100'],
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusPrimary,
          },
        },
      },
      ghost: {
        background: 'transparent',
        color: vars.text.secondary,
        border: '1px solid transparent',
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.background.tertiary,
            color: vars.text.primary,
          },
          '&:active:not(:disabled)': {
            background: vars.colors.neutral['200'],
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.tertiary,
            boxShadow: vars.shadows.focus,
          },
        },
      },
      success: {
        background: vars.colors.semantic.success['500'],
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.semantic.success['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.semantic.success['600'],
            borderColor: vars.colors.semantic.success['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.semantic.success['700'],
            borderColor: vars.colors.semantic.success['700'],
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusSuccess,
          },
        },
      },
      danger: {
        background: vars.colors.semantic.error['500'],
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.semantic.error['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.semantic.error['600'],
            borderColor: vars.colors.semantic.error['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.semantic.error['700'],
            borderColor: vars.colors.semantic.error['700'],
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusError,
          },
        },
      },
      warning: {
        background: vars.colors.semantic.warning['500'],
        color: vars.colors.semantic.warning['900'],
        border: `1px solid ${vars.colors.semantic.warning['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.semantic.warning['600'],
            borderColor: vars.colors.semantic.warning['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.semantic.warning['700'],
            borderColor: vars.colors.semantic.warning['700'],
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusWarning,
          },
        },
      },
      info: {
        background: vars.colors.semantic.info['500'],
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.semantic.info['500']}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.semantic.info['600'],
            borderColor: vars.colors.semantic.info['600'],
            boxShadow: vars.shadows.md,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.semantic.info['700'],
            borderColor: vars.colors.semantic.info['700'],
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${vars.colors.semantic.info['200']}`,
          },
        },
      },
      link: {
        background: 'transparent',
        color: vars.text.link,
        border: '1px solid transparent',
        selectors: {
          '&:hover:not(:disabled)': {
            color: vars.text.linkHover,
            textDecoration: 'underline',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focus,
          },
        },
      },
    },
    size: {
      sm: {
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
        fontSize: vars.typography.size.sm,
        fontWeight: vars.typography.weight.medium,
        minHeight: vars.spacing['8'],
        gap: vars.spacing['1.5'],
      },
      md: {
        paddingTop: vars.spacing['2.5'],
        paddingBottom: vars.spacing['2.5'],
        paddingLeft: vars.spacing['4'],
        paddingRight: vars.spacing['4'],
        fontSize: vars.typography.size.base,
        fontWeight: vars.typography.weight.medium,
        minHeight: vars.spacing['10'],
        gap: vars.spacing['2'],
      },
      lg: {
        paddingTop: vars.spacing['3'],
        paddingBottom: vars.spacing['3'],
        paddingLeft: vars.spacing['6'],
        paddingRight: vars.spacing['6'],
        fontSize: vars.typography.size.lg,
        fontWeight: vars.typography.weight.semibold,
        minHeight: vars.spacing['12'],
        gap: vars.spacing['2'],
      },
    },
    isFullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
    isRounded: {
      true: { borderRadius: vars.border.radius.full },
      false: {},
    },
    isLoading: {
      true: {
        cursor: 'wait',
        '::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1.2em',
          height: '1.2em',
          margin: '-0.6em 0 0 -0.6em',
          borderRadius: '50%',
          border: '2px solid',
          borderColor: 'currentColor transparent currentColor transparent',
          animation: `${spin} 1s linear infinite`,
        },
      },
      false: {},
    },
    hasStartIcon: {
      true: {},
      false: {},
    },
    hasEndIcon: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [
    // Icon padding overrides (applied after size variants, so they win)
    { variants: { hasStartIcon: true }, style: { paddingLeft: vars.spacing['3'] } },
    { variants: { hasEndIcon: true }, style: { paddingRight: vars.spacing['3'] } },
    // Loading hides text colour
    { variants: { isLoading: true }, style: { color: 'transparent' } },
  ],
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    isFullWidth: false,
    isRounded: false,
    isLoading: false,
    hasStartIcon: false,
    hasEndIcon: false,
  },
});
