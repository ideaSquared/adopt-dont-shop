import { recipe } from '@vanilla-extract/recipes';
import { keyframes, style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../styles/theme.css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

const pulse = keyframes({
  '0%, 80%, 100%': { transform: 'scale(0)' },
  '40%': { transform: 'scale(1)' },
});

export const container = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
});

export const spinner = recipe({
  base: {
    borderRadius: '50%',
    borderStyle: 'solid',
    animation: `${spin} 0.75s linear infinite`,
  },
  variants: {
    size: {
      xs: { width: '1rem', height: '1rem', borderWidth: '1px' },
      sm: { width: '1.25rem', height: '1.25rem', borderWidth: '2px' },
      md: { width: '1.5rem', height: '1.5rem', borderWidth: '2px' },
      lg: { width: '2rem', height: '2rem', borderWidth: '3px' },
      xl: { width: '3rem', height: '3rem', borderWidth: '4px' },
    },
    variant: {
      default: {
        borderColor: vars.border.color.primary,
        borderRightColor: 'transparent',
      },
      primary: {
        borderColor: vars.background.primary,
        borderRightColor: 'transparent',
      },
      secondary: {
        borderColor: vars.background.secondary,
        borderRightColor: 'transparent',
      },
      current: {
        borderColor: 'currentColor',
        borderRightColor: 'transparent',
      },
    },
  },
  defaultVariants: { size: 'md', variant: 'default' },
});

export const label = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.disabled,
  fontWeight: vars.typography.weight.medium,
});

export const dotContainer = styleVariants({
  xs: { display: 'inline-flex', alignItems: 'center', gap: '2px' },
  sm: { display: 'inline-flex', alignItems: 'center', gap: '2px' },
  md: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
  lg: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
  xl: { display: 'inline-flex', alignItems: 'center', gap: '4px' },
});

export const dot = recipe({
  base: {
    borderRadius: '50%',
    animation: `${pulse} 1.4s ease-in-out infinite both`,
    animationDelay: 'var(--dot-delay)',
  },
  variants: {
    size: {
      xs: { width: '0.25rem', height: '0.25rem' },
      sm: { width: '0.375rem', height: '0.375rem' },
      md: { width: '0.5rem', height: '0.5rem' },
      lg: { width: '0.625rem', height: '0.625rem' },
      xl: { width: '0.75rem', height: '0.75rem' },
    },
    variant: {
      default: { backgroundColor: vars.border.color.primary },
      primary: { backgroundColor: vars.background.primary },
      secondary: { backgroundColor: vars.background.secondary },
      current: { backgroundColor: 'currentColor' },
    },
  },
  defaultVariants: { size: 'md', variant: 'default' },
});
