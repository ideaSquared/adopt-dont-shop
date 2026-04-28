import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '../../../lib.components/src/styles/theme.css';

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
  info: [bannerBase, { background: vars.colors.primary['500'] }],
  warning: [bannerBase, { background: vars.colors.semantic.warning['500'] }],
  error: [bannerBase, { background: vars.colors.semantic.error['500'] }],
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
  info: [dotBase, { background: vars.colors.primary['100'] }],
  warning: [dotBase, { background: vars.colors.semantic.warning['100'] }],
  error: [dotBase, { background: vars.colors.semantic.error['100'] }],
});

export const statusText = style({
  flex: '1',
  textAlign: 'center',
});
