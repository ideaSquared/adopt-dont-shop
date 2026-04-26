import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const container = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    minHeight: '200px',
  },
  variants: {
    size: {
      sm: { padding: vars.spacing.lg },
      md: { padding: vars.spacing.xl },
      lg: { padding: vars.spacing['2xl'] },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const iconContainer = styleVariants({
  sm: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '48px', height: '48px', marginBottom: vars.spacing.sm },
  md: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '64px', height: '64px', marginBottom: vars.spacing.md },
  lg: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '80px', height: '80px', marginBottom: vars.spacing.lg },
});
globalStyle(`${iconContainer.sm} svg`, { width: '100%', height: '100%' });
globalStyle(`${iconContainer.md} svg`, { width: '100%', height: '100%' });
globalStyle(`${iconContainer.lg} svg`, { width: '100%', height: '100%' });

export const iconColor = styleVariants({
  default: { color: vars.colors.neutral['400'] },
  error: { color: vars.colors.semantic.error['500'] },
  search: { color: vars.colors.primary['500'] },
  loading: { color: vars.colors.neutral['300'] },
});

export const image = style({
  maxWidth: '100%',
  height: 'auto',
  marginBottom: vars.spacing.md,
});

export const title = recipe({
  base: {
    margin: 0,
    fontWeight: vars.typography.weight.semibold,
    lineHeight: '1.3',
  },
  variants: {
    size: {
      sm: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing.xs },
      md: { fontSize: vars.typography.size.xl, marginBottom: vars.spacing.sm },
      lg: { fontSize: vars.typography.size['2xl'], marginBottom: vars.spacing.md },
    },
    variant: {
      default: { color: vars.colors.neutral['700'] },
      error: { color: vars.colors.semantic.error['900'] },
      search: { color: vars.colors.neutral['700'] },
      loading: { color: vars.colors.neutral['600'] },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

export const description = recipe({
  base: {
    margin: 0,
    lineHeight: '1.5',
    maxWidth: '400px',
  },
  variants: {
    size: {
      sm: { fontSize: vars.typography.size.sm, marginBottom: vars.spacing.md },
      md: { fontSize: vars.typography.size.base, marginBottom: vars.spacing.lg },
      lg: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing.xl },
    },
    variant: {
      default: { color: vars.colors.neutral['500'] },
      error: { color: vars.colors.neutral['600'] },
      search: { color: vars.colors.neutral['500'] },
      loading: { color: vars.colors.neutral['400'] },
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

export const actionContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing.sm,
  alignItems: 'center',
  '@media': {
    [`(min-width: ${vars.breakpoints.sm})`]: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
  },
});

export const actionButton = recipe({
  base: {
    padding: `${vars.spacing.sm} ${vars.spacing.lg}`,
    borderRadius: vars.border.radius.md,
    fontWeight: vars.typography.weight.medium,
    fontSize: vars.typography.size.sm,
    cursor: 'pointer',
    transition: `all ${vars.transitions.fast}`,
    textDecoration: 'none',
    border: '1px solid',
    selectors: {
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
      '&:focus': {
        outline: `2px solid ${vars.colors.primary['500']}`,
        outlineOffset: '2px',
      },
    },
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: vars.colors.primary['500'],
        borderColor: vars.colors.primary['500'],
        color: vars.colors.neutral['50'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.primary['700'],
            borderColor: vars.colors.primary['700'],
          },
        },
      },
      secondary: {
        backgroundColor: 'transparent',
        borderColor: vars.colors.neutral['300'],
        color: vars.colors.neutral['700'],
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.neutral['50'],
            borderColor: vars.colors.neutral['400'],
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});
