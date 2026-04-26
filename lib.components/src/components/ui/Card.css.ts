import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

export const card = recipe({
  base: {
    position: 'relative',
    borderRadius: vars.border.radius.xl,
    transition: `all ${vars.transitions.normal} ${vars.animations.easing.smooth}`,
    overflow: 'hidden',
    isolation: 'isolate',
    selectors: {
      '&:focus-visible': {
        outline: 'none',
        boxShadow: vars.shadows.focusPrimary,
        transform: 'translateY(-2px)',
      },
    },
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
        selectors: {
          '&:hover': { transform: 'none' },
          '&:active': { transform: 'none' },
        },
      },
    },
  },
  variants: {
    variant: {
      default: {
        background: vars.background.secondary,
        border: `1px solid ${vars.border.color.primary}`,
        boxShadow: vars.shadows.md,
        backdropFilter: 'blur(10px)',
      },
      outlined: {
        background: vars.background.secondary,
        border: `1px solid ${vars.border.color.primary}`,
        boxShadow: 'none',
        backdropFilter: 'blur(10px)',
      },
      elevated: {
        background: vars.background.secondary,
        border: 'none',
        boxShadow: vars.shadows.xl,
        backdropFilter: 'blur(10px)',
      },
      filled: {
        background: vars.background.tertiary,
        border: 'none',
        boxShadow: vars.shadows.md,
        backdropFilter: 'blur(10px)',
      },
      glass: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: vars.shadows.lg,
        backdropFilter: 'blur(20px)',
        selectors: {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            borderRadius: 'inherit',
            zIndex: '-1',
          },
        },
      },
    },
    padding: {
      none: { padding: 0 },
      sm: { padding: vars.spacing['3'] },
      md: { padding: vars.spacing['4'] },
      lg: { padding: vars.spacing['6'] },
    },
    clickable: {
      true: { cursor: 'pointer', userSelect: 'none' },
      false: {},
    },
    hoverable: {
      true: {
        selectors: {
          '&:hover': { transform: 'translateY(-4px) scale(1.02)', boxShadow: vars.shadows['2xl'] },
          '&:active': { transform: 'translateY(-2px) scale(1.01)', boxShadow: vars.shadows.xl },
        },
      },
      false: {},
    },
    bordered: {
      true: { border: `1px solid ${vars.border.color.secondary}` },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    clickable: false,
    hoverable: false,
    bordered: false,
  },
});

const cardHeaderBase = style({
  paddingTop: vars.spacing['4'],
  paddingLeft: vars.spacing['4'],
  paddingRight: vars.spacing['4'],
  paddingBottom: '0',
  marginBottom: vars.spacing['4'],
});
globalStyle(`${cardHeaderBase} h1, ${cardHeaderBase} h2, ${cardHeaderBase} h3, ${cardHeaderBase} h4, ${cardHeaderBase} h5, ${cardHeaderBase} h6`, {
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
});
globalStyle(`${cardHeaderBase} p`, { color: vars.text.secondary, marginBottom: '0' });

export const cardHeader = recipe({
  base: cardHeaderBase,
  variants: {
    bordered: {
      true: {
        borderBottom: `1px solid ${vars.border.color.tertiary}`,
        paddingBottom: vars.spacing['4'],
      },
      false: {},
    },
  },
  defaultVariants: { bordered: false },
});

export const cardContent = style({
  flex: '1',
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const cardFooter = recipe({
  base: {
    paddingLeft: vars.spacing['4'],
    paddingRight: vars.spacing['4'],
    paddingBottom: vars.spacing['4'],
    paddingTop: '0',
    marginTop: vars.spacing['4'],
    display: 'flex',
    gap: vars.spacing['3'],
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  variants: {
    bordered: {
      true: {
        borderTop: `1px solid ${vars.border.color.tertiary}`,
        paddingTop: vars.spacing['4'],
      },
      false: {},
    },
  },
  defaultVariants: { bordered: false },
});
