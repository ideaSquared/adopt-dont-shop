import { keyframes, style, globalStyle } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

const float = keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-12px)' },
});

const wag = keyframes({
  '0%, 100%': { transform: 'rotate(0deg)' },
  '25%': { transform: 'rotate(15deg)' },
  '75%': { transform: 'rotate(-15deg)' },
});

const sniff = keyframes({
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.15)' },
});

const drift = keyframes({
  '0%': { transform: 'translateX(-20px)', opacity: '0' },
  '20%': { opacity: '1' },
  '80%': { opacity: '1' },
  '100%': { transform: 'translateX(20px)', opacity: '0' },
});

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '70vh',
  padding: vars.spacing['6'],
  textAlign: 'center',
  overflow: 'hidden',
});

export const scene = style({
  position: 'relative',
  marginBottom: vars.spacing['6'],
});

export const dog = style({
  fontSize: '6rem',
  lineHeight: 1,
  animation: `${float} 3s ease-in-out infinite`,
});

export const nose = style({
  display: 'inline-block',
  animation: `${sniff} 1.5s ease-in-out infinite`,
});

export const tail = style({
  display: 'inline-block',
  fontSize: '2rem',
  animation: `${wag} 0.6s ease-in-out infinite`,
  transformOrigin: 'bottom center',
  position: 'absolute',
  right: '-1.5rem',
  top: '0.5rem',
});

export const pawprints = style({
  display: 'flex',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
  fontSize: '1.5rem',
  opacity: 0.4,
  animation: `${drift} 4s ease-in-out infinite`,
});

export const code = style({
  fontSize: '5rem',
  fontWeight: 800,
  margin: 0,
  background: vars.colors.gradientBrand,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  lineHeight: 1.1,
});

export const title = style({
  margin: `${vars.spacing['2']} 0 ${vars.spacing['3']}`,
  fontSize: '1.75rem',
  fontWeight: 700,
  color: vars.text.primary,
});

export const body = style({
  color: vars.text.secondary,
  maxWidth: '28rem',
  margin: `0 0 ${vars.spacing['5']}`,
  lineHeight: 1.6,
});

export const subtitle = style({
  color: vars.text.tertiary,
  fontSize: '0.875rem',
  fontStyle: 'italic',
  margin: `0 0 ${vars.spacing['5']}`,
});

export const homeLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  color: 'white',
  backgroundColor: vars.colors.primary,
  padding: `${vars.spacing['3']} ${vars.spacing['5']}`,
  borderRadius: vars.border.radius.lg,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '1rem',
  boxShadow: vars.shadows.base,
  transition: 'all 0.2s ease',
  ':hover': {
    backgroundColor: vars.colors.primaryHover,
    boxShadow: vars.shadows.lg,
    transform: 'translateY(-1px)',
  },
  ':active': {
    transform: 'translateY(0)',
  },
});

export const suggestions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  justifyContent: 'center',
  marginTop: vars.spacing['4'],
});

export const suggestionLink = style({
  color: vars.text.link,
  textDecoration: 'none',
  padding: `${vars.spacing['1']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  border: `${vars.border.width.thin} solid ${vars.border.color.muted}`,
  fontSize: '0.875rem',
  transition: 'all 0.15s ease',
  ':hover': {
    backgroundColor: vars.colors.primaryBgSubtle,
    borderColor: vars.colors.primaryBorderSubtle,
    color: vars.text.linkHover,
  },
});
