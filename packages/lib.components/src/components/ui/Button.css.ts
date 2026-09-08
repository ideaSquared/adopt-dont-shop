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
      '(max-width: 768px)': { minHeight: vars.spacing['5'] },
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
        selectors: { '&::after': { animation: 'none' }, '&::before': { animation: 'none' } },
      },
    },
  },
  variants: {
    variant: {
      primary: {
        background: vars.colors.primary,
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.primary}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.primaryHover,
            borderColor: vars.colors.primaryHover,
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.primaryActive,
            borderColor: vars.colors.primaryActive,
            transform: 'translateY(0)',
            boxShadow: vars.shadows.sm,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focus,
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
        // ADS-1326: colors.secondary (#14B8A6) against text.inverse (white)
        // measures only ~2.49:1 — the color-contrast violation axe-core's
        // smoke gate caught on the client home page's "Get Started" button
        // (well under the 4.5:1 AA floor). secondaryActive (#0F766E) clears
        // it at ~5.47:1. It's already the darkest step in the secondary
        // ramp, so hover/active no longer shift the color — lift and shadow
        // still carry the interaction feedback.
        background: vars.colors.secondaryActive,
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.secondaryActive}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            transform: 'translateY(0)',
            boxShadow: vars.shadows.sm,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${vars.colors.secondaryBorderSubtle}`,
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
        // ADS-1326: colors.primaryHover (#E11D48) measures 4.7:1 on white
        // but only 4.4:1 on the `normal` theme's warm-cream body — the
        // color-contrast violation axe-core's smoke gate caught on the
        // client home page's "View All Pets" button, which sits directly
        // on that body background. primaryActive (#BE123C) clears 4.5:1 on
        // both (6.29:1 / 5.88:1) — the same token already used for hover.
        background: 'transparent',
        color: vars.colors.primaryActive,
        border: `1px solid ${vars.border.color.default}`,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.primaryBgSubtle,
            borderColor: vars.colors.primaryBorderSubtle,
            transform: 'translateY(-1px)',
            boxShadow: vars.shadows.sm,
          },
          '&:active:not(:disabled)': {
            background: vars.colors.primaryBgSubtle,
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focus,
          },
        },
      },
      ghost: {
        background: 'transparent',
        color: vars.text.secondary,
        border: '1px solid transparent',
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.background.muted,
            color: vars.text.primary,
          },
          '&:active:not(:disabled)': {
            background: vars.border.color.muted,
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.muted,
            boxShadow: vars.shadows.focus,
          },
        },
      },
      success: {
        background: vars.colors.success,
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.success}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.successHover,
            borderColor: vars.colors.successHover,
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.successActive,
            borderColor: vars.colors.successActive,
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focus,
          },
        },
      },
      danger: {
        background: vars.colors.danger,
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.danger}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.dangerHover,
            borderColor: vars.colors.dangerHover,
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.dangerActive,
            borderColor: vars.colors.dangerActive,
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focusDanger,
          },
        },
      },
      warning: {
        background: vars.colors.warning,
        color: vars.colors.warningTextEmphasis,
        border: `1px solid ${vars.colors.warning}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.warningHover,
            borderColor: vars.colors.warningHover,
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.warningActive,
            borderColor: vars.colors.warningActive,
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: vars.shadows.focus,
          },
        },
      },
      info: {
        background: vars.colors.info,
        color: vars.text.inverse,
        border: `1px solid ${vars.colors.info}`,
        boxShadow: vars.shadows.sm,
        selectors: {
          '&:hover:not(:disabled)': {
            background: vars.colors.infoHover,
            borderColor: vars.colors.infoHover,
            boxShadow: vars.shadows.base,
            transform: 'translateY(-1px)',
          },
          '&:active:not(:disabled)': {
            background: vars.colors.infoActive,
            borderColor: vars.colors.infoActive,
            transform: 'translateY(0)',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${vars.colors.infoBorderSubtle}`,
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
        paddingLeft: vars.spacing['2'],
        paddingRight: vars.spacing['2'],
        fontSize: vars.typography.size.sm,
        fontWeight: vars.typography.weight.medium,
        minHeight: vars.spacing['5'],
        gap: vars.spacing['1'],
      },
      md: {
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
        fontSize: vars.typography.size.base,
        fontWeight: vars.typography.weight.medium,
        minHeight: vars.spacing['5'],
        gap: vars.spacing['2'],
      },
      lg: {
        paddingTop: vars.spacing['2'],
        paddingBottom: vars.spacing['2'],
        paddingLeft: vars.spacing['4'],
        paddingRight: vars.spacing['4'],
        fontSize: vars.typography.size.lg,
        fontWeight: vars.typography.weight.semibold,
        minHeight: vars.spacing['6'],
        gap: vars.spacing['2'],
      },
    },
    isFullWidth: {
      true: { width: '100%' },
      false: { width: 'auto' },
    },
    isRounded: {
      true: { borderRadius: vars.border.radius.pill },
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
    { variants: { hasStartIcon: true }, style: { paddingLeft: vars.spacing['2'] } },
    { variants: { hasEndIcon: true }, style: { paddingRight: vars.spacing['2'] } },
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
