import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../styles/theme.css';

export const container = recipe({
  base: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    background: vars.border.color.muted,
    color: vars.text.tertiary,
    fontFamily: vars.typography.family.sans,
    fontWeight: vars.typography.weight.medium,
    transition: `all ${vars.transitions.fast}`,
    selectors: {
      [`:is(html.${darkThemeClass}) &`]: {
        background: vars.text.secondary,
        color: vars.border.color.default,
      },
    },
    '@media': {
      '(prefers-reduced-motion: reduce)': { transition: 'none' },
    },
  },
  variants: {
    size: {
      xs: {
        width: vars.spacing['4'],
        height: vars.spacing['4'],
        fontSize: vars.typography.size.xs,
      },
      sm: {
        width: vars.spacing['5'],
        height: vars.spacing['5'],
        fontSize: vars.typography.size.sm,
      },
      md: {
        width: vars.spacing['5'],
        height: vars.spacing['5'],
        fontSize: vars.typography.size.base,
      },
      lg: {
        width: vars.spacing['6'],
        height: vars.spacing['6'],
        fontSize: vars.typography.size.lg,
      },
      xl: {
        width: vars.spacing['7'],
        height: vars.spacing['7'],
        fontSize: vars.typography.size.xl,
      },
      '2xl': {
        width: vars.spacing['7'],
        height: vars.spacing['7'],
        fontSize: vars.typography.size['2xl'],
      },
    },
    shape: {
      circle: { borderRadius: vars.border.radius.pill },
      square: { borderRadius: vars.border.radius.lg },
    },
    clickable: {
      true: {
        cursor: 'pointer',
        selectors: {
          '&:hover': { transform: 'scale(1.05)', boxShadow: vars.shadows.base },
          '&:focus-visible': { outline: 'none', boxShadow: vars.shadows.focus },
          '&:active': { transform: 'scale(0.95)' },
        },
        '@media': {
          '(prefers-reduced-motion: reduce)': {
            selectors: {
              '&:hover': { transform: 'none' },
              '&:active': { transform: 'none' },
            },
          },
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    size: 'md',
    shape: 'circle',
    clickable: false,
  },
});

export const image = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 'inherit',
});

export const initials = style({
  textTransform: 'uppercase',
  userSelect: 'none',
  lineHeight: '1',
});

const fallbackBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  color: 'inherit',
} as const;
export const fallbackIconContainer = styleVariants({
  xs: fallbackBase,
  sm: fallbackBase,
  md: fallbackBase,
  lg: fallbackBase,
  xl: fallbackBase,
  '2xl': fallbackBase,
});
globalStyle(`${fallbackIconContainer.xs} svg`, { width: '16px', height: '16px' });
globalStyle(`${fallbackIconContainer.sm} svg`, { width: '20px', height: '20px' });
globalStyle(`${fallbackIconContainer.md} svg`, { width: '24px', height: '24px' });
globalStyle(`${fallbackIconContainer.lg} svg`, { width: '28px', height: '28px' });
globalStyle(`${fallbackIconContainer.xl} svg`, { width: '32px', height: '32px' });
globalStyle(`${fallbackIconContainer['2xl']} svg`, { width: '40px', height: '40px' });

export const statusDot = recipe({
  base: {
    position: 'absolute',
    borderRadius: vars.border.radius.pill,
    border: `2px solid ${vars.background.surface}`,
  },
  variants: {
    size: {
      xs: { width: vars.spacing['2'], height: vars.spacing['2'], bottom: '0', right: '0' },
      sm: { width: vars.spacing['2'], height: vars.spacing['2'], bottom: '0', right: '0' },
      md: { width: vars.spacing['2'], height: vars.spacing['2'], bottom: '0', right: '0' },
      lg: { width: vars.spacing['2'], height: vars.spacing['2'], bottom: '1px', right: '1px' },
      xl: { width: vars.spacing['3'], height: vars.spacing['3'], bottom: '2px', right: '2px' },
      '2xl': { width: vars.spacing['3'], height: vars.spacing['3'], bottom: '3px', right: '3px' },
    },
    status: {
      online: { background: vars.colors.success },
      offline: { background: vars.border.color.strong },
      away: { background: vars.colors.warning },
      busy: { background: vars.colors.danger },
      none: { background: 'transparent' },
    },
  },
  defaultVariants: {
    size: 'md',
    status: 'none',
  },
});
