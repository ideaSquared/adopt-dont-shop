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
      sm: { padding: vars.spacing['4'] },
      md: { padding: vars.spacing['5'] },
      lg: { padding: vars.spacing['6'] },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const iconContainer = styleVariants({
  sm: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '48px',
    height: '48px',
    marginBottom: vars.spacing['2'],
  },
  md: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '64px',
    height: '64px',
    marginBottom: vars.spacing['3'],
  },
  lg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '80px',
    height: '80px',
    marginBottom: vars.spacing['4'],
  },
});
globalStyle(`${iconContainer.sm} svg`, { width: '100%', height: '100%' });
globalStyle(`${iconContainer.md} svg`, { width: '100%', height: '100%' });
globalStyle(`${iconContainer.lg} svg`, { width: '100%', height: '100%' });

export const iconColor = styleVariants({
  default: { color: vars.border.color.strong },
  error: { color: vars.colors.danger },
  search: { color: vars.colors.primary },
  loading: { color: vars.border.color.default },
});

export const image = style({
  maxWidth: '100%',
  height: 'auto',
  marginBottom: vars.spacing['3'],
});

export const title = recipe({
  base: {
    margin: 0,
    fontWeight: vars.typography.weight.semibold,
    lineHeight: '1.3',
  },
  variants: {
    size: {
      sm: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['1'] },
      md: { fontSize: vars.typography.size.xl, marginBottom: vars.spacing['2'] },
      lg: { fontSize: vars.typography.size['2xl'], marginBottom: vars.spacing['3'] },
    },
    variant: {
      default: { color: vars.text.secondary },
      error: { color: vars.colors.dangerTextEmphasis },
      search: { color: vars.text.secondary },
      loading: { color: vars.text.tertiary },
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
      sm: { fontSize: vars.typography.size.sm, marginBottom: vars.spacing['3'] },
      md: { fontSize: vars.typography.size.base, marginBottom: vars.spacing['4'] },
      lg: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['5'] },
    },
    variant: {
      default: { color: vars.text.muted },
      error: { color: vars.text.tertiary },
      search: { color: vars.text.muted },
      loading: { color: vars.border.color.strong },
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
  gap: vars.spacing['2'],
  alignItems: 'center',
  '@media': {
    '(min-width: 640px)': {
      flexDirection: 'row',
      justifyContent: 'center',
    },
  },
});

export const actionButton = recipe({
  base: {
    padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
    borderRadius: vars.border.radius.base,
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
        outline: `2px solid ${vars.colors.primary}`,
        outlineOffset: '2px',
      },
    },
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: vars.colors.primary,
        borderColor: vars.colors.primary,
        color: vars.background.body,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.colors.primaryActive,
            borderColor: vars.colors.primaryActive,
          },
        },
      },
      secondary: {
        backgroundColor: 'transparent',
        borderColor: vars.border.color.default,
        color: vars.text.secondary,
        selectors: {
          '&:hover:not(:disabled)': {
            backgroundColor: vars.background.body,
            borderColor: vars.border.color.strong,
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});
