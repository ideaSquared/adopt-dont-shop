import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components';

const bounce = keyframes({
  '0%, 60%, 100%': { transform: 'translateY(0)' },
  '30%': { transform: 'translateY(-10px)' },
});

export const typingContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  margin: '0.25rem 1rem 0.5rem 1rem',
  background: vars.background.secondary,
  borderRadius: '18px 18px 18px 4px',
  maxWidth: '200px',
  color: vars.text.secondary,
  fontSize: '0.8125rem',
  fontWeight: '500',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
});

export const typingDots = style({
  display: 'flex',
  gap: '2px',
});

const dotBase = style({
  width: '3px',
  height: '3px',
  background: vars.text.tertiary,
  borderRadius: '50%',
  animationName: bounce,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
});

export const dot = styleVariants({
  delay0: [dotBase, { animationDelay: '0s' }],
  delay1: [dotBase, { animationDelay: '0.1s' }],
  delay2: [dotBase, { animationDelay: '0.2s' }],
});
