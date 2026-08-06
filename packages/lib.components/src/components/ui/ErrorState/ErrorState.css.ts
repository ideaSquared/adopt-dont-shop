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

export const iconColor = style({
  color: vars.colors.danger,
});

export const title = recipe({
  base: {
    margin: 0,
    fontWeight: vars.typography.weight.semibold,
    lineHeight: '1.3',
    color: vars.colors.dangerTextEmphasis,
  },
  variants: {
    size: {
      sm: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['1'] },
      md: { fontSize: vars.typography.size.xl, marginBottom: vars.spacing['2'] },
      lg: { fontSize: vars.typography.size['2xl'], marginBottom: vars.spacing['3'] },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const message = recipe({
  base: {
    margin: 0,
    lineHeight: '1.5',
    maxWidth: '400px',
    color: vars.text.tertiary,
  },
  variants: {
    size: {
      sm: { fontSize: vars.typography.size.sm, marginBottom: vars.spacing['3'] },
      md: { fontSize: vars.typography.size.base, marginBottom: vars.spacing['4'] },
      lg: { fontSize: vars.typography.size.lg, marginBottom: vars.spacing['5'] },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const retryButton = style({
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  border: '1px solid',
  backgroundColor: vars.colors.primary,
  borderColor: vars.colors.primary,
  color: vars.background.body,
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.primaryActive,
      borderColor: vars.colors.primaryActive,
    },
    '&:focus': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
  },
});
