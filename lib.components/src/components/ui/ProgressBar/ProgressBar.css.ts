import { recipe } from '@vanilla-extract/recipes';
import { keyframes, style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

const pulseStripes = keyframes({
  '0%': { backgroundPosition: '1rem 0' },
  '100%': { backgroundPosition: '0 0' },
});

const indeterminateSlide = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(400%)' },
});

export const progressContainer = style({ width: '100%' });

export const labelContainer = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['1'],
});

export const label = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.text.secondary,
});

export const valueText = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const progressTrack = recipe({
  base: {
    width: '100%',
    backgroundColor: vars.border.color.muted,
    borderRadius: vars.border.radius.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  variants: {
    size: {
      sm: { height: '6px' },
      md: { height: '10px' },
      lg: { height: '16px' },
    },
  },
  defaultVariants: { size: 'md' },
});

export const progressFill = recipe({
  base: {
    height: '100%',
    borderRadius: 'inherit',
    transition: 'width 0.3s ease-in-out',
    position: 'relative',
  },
  variants: {
    variant: {
      default: { backgroundColor: vars.colors.primary },
      success: { backgroundColor: vars.colors.success },
      warning: { backgroundColor: vars.colors.warning },
      error: { backgroundColor: vars.colors.danger },
    },
    striped: {
      true: {
        backgroundImage:
          'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
        backgroundSize: '1rem 1rem',
      },
      false: {},
    },
    animated: {
      true: {
        animation: `${pulseStripes} 2s infinite linear`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      false: {},
    },
    indeterminate: {
      true: {
        width: '25%',
        animation: `${indeterminateSlide} 2s infinite linear`,
        '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
      },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'default',
    striped: false,
    animated: false,
    indeterminate: false,
  },
});

export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
});
