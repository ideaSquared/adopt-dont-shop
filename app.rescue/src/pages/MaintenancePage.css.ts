import { keyframes, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

const sleep = keyframes({
  '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
  '50%': { transform: 'translateY(-8px) rotate(5deg)', opacity: '0.7' },
});

const zzz = keyframes({
  '0%': { transform: 'translateY(0) translateX(0) scale(0.5)', opacity: '0' },
  '50%': { opacity: '1' },
  '100%': { transform: 'translateY(-40px) translateX(20px) scale(1.2)', opacity: '0' },
});

const blink = keyframes({
  '0%, 48%, 52%, 100%': { opacity: '1' },
  '50%': { opacity: '0.3' },
});

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80vh',
  padding: vars.spacing['6'],
  textAlign: 'center',
});

export const scene = style({
  position: 'relative',
  marginBottom: vars.spacing['5'],
});

export const cat = style({
  fontSize: '5rem',
  lineHeight: 1,
  animation: `${sleep} 4s ease-in-out infinite`,
});

export const zzzBubble = style({
  position: 'absolute',
  top: '-0.5rem',
  right: '-2rem',
  fontSize: '1.5rem',
  animation: `${zzz} 2s ease-in-out infinite`,
});

export const zzzBubbleDelayed = style({
  position: 'absolute',
  top: '-1rem',
  right: '-1rem',
  fontSize: '1.2rem',
  animation: `${zzz} 2s ease-in-out 0.7s infinite`,
});

export const hardhat = style({
  fontSize: '2.5rem',
  display: 'block',
  marginBottom: vars.spacing['2'],
});

export const title = style({
  fontSize: '1.75rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['3']}`,
});

export const body = style({
  color: vars.text.secondary,
  maxWidth: '30rem',
  margin: `0 0 ${vars.spacing['4']}`,
  lineHeight: 1.6,
});

export const subtitle = style({
  color: vars.text.tertiary,
  fontSize: '0.875rem',
  fontStyle: 'italic',
  margin: `0 0 ${vars.spacing['5']}`,
});

export const progressBar = style({
  width: '12rem',
  height: '0.5rem',
  borderRadius: vars.border.radius.pill,
  backgroundColor: vars.gray['200'],
  overflow: 'hidden',
  marginBottom: vars.spacing['5'],
});

export const progressFill = style({
  height: '100%',
  width: '30%',
  borderRadius: vars.border.radius.pill,
  background: vars.colors.gradientBrand,
});

export const statusDot = style({
  display: 'inline-block',
  width: '0.5rem',
  height: '0.5rem',
  borderRadius: '50%',
  backgroundColor: vars.colors.warning,
  marginRight: vars.spacing['2'],
  animation: `${blink} 2s ease-in-out infinite`,
});

export const statusRow = style({
  display: 'inline-flex',
  alignItems: 'center',
  color: vars.text.tertiary,
  fontSize: '0.875rem',
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.base,
  backgroundColor: vars.background.muted,
});

export const critters = style({
  display: 'flex',
  gap: vars.spacing['4'],
  marginTop: vars.spacing['7'],
  fontSize: '2rem',
  opacity: 0.3,
});
