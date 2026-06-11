import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

const pulse = keyframes({
  '0%, 100%': { opacity: '1' },
  '50%': { opacity: '0.5' },
});

const bannerBase = style({
  padding: '0.75rem 1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.inverse,
  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  animationName: pulse,
  animationDuration: '2s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  '@media': {
    '(max-width: 768px)': {
      padding: '0.5rem 0.75rem',
      fontSize: '0.813rem',
    },
  },
});

export const banner = styleVariants({
  info: [bannerBase, { background: vars.colors.primary }],
  warning: [bannerBase, { background: vars.colors.warning }],
  error: [bannerBase, { background: vars.colors.danger }],
});

const dotBase = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  animationDuration: '1.5s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationName: pulse,
});

export const statusDot = styleVariants({
  info: [dotBase, { background: vars.colors.primaryBgSubtle }],
  warning: [dotBase, { background: vars.colors.warningBgSubtle }],
  error: [dotBase, { background: vars.colors.dangerBgSubtle }],
});

export const statusText = style({
  flex: '1',
  textAlign: 'center',
});
