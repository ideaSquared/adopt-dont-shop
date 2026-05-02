import { style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = recipe({
  base: {
    background: 'white',
    border: `1px solid ${vars.colors.neutral['200']}`,
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.2s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        ':hover': {
          borderColor: vars.colors.primary['300'],
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transform: 'translateY(-2px)',
        },
      },
      false: {
        cursor: 'default',
      },
    },
  },
  defaultVariants: {
    clickable: false,
  },
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
});

export const title = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.secondary,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
});

export const iconContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.5rem',
  height: '2.5rem',
  borderRadius: '8px',
  background: vars.colors.primary['50'],
  color: vars.colors.primary['600'],
  fontSize: '1.25rem',
});

export const value = style({
  fontSize: '2.25rem',
  fontWeight: '700',
  color: vars.text.primary,
  marginBottom: '0.5rem',
  lineHeight: '1',
});

export const trendContainer = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  variants: {
    positive: {
      true: { color: vars.colors.semantic.success['600'] },
      false: { color: vars.colors.semantic.error['600'] },
    },
  },
  defaultVariants: {
    positive: true,
  },
});

export const trendIcon = style({
  display: 'flex',
  alignItems: 'center',
  fontSize: '1rem',
});

export const subtitle = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  marginTop: '0.25rem',
});

const shimmer = keyframes({
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(300%)' },
});

export const loadingBar = style({
  height: '4px',
  background: vars.colors.neutral['200'],
  borderRadius: '2px',
  overflow: 'hidden',
  marginTop: 'auto',
  '::after': {
    content: "''",
    display: 'block',
    height: '100%',
    width: '40%',
    background: vars.colors.primary['500'],
    animation: `${shimmer} 1.5s infinite`,
  },
});
