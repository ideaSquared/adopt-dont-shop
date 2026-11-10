import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const navbarContainer = style({
  background: vars.colors.gradientPrimary,
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: vars.shadows.base,
});

export const navContent = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `0 ${vars.spacing['3']}`,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  height: '64px',
  '@media': {
    '(max-width: 768px)': {
      height: '56px',
      padding: `0 ${vars.spacing['2']}`,
      gap: vars.spacing['2'],
    },
  },
});

export const logo = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.bold,
  color: '#fff',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  // The logo gives way before the right slot does: when the wordmark renders
  // wider than expected (web font failed or still loading) it truncates
  // instead of pushing the icons and avatar past the viewport edge.
  minWidth: 0,
  flexShrink: 1,
  overflow: 'hidden',
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
    borderRadius: vars.border.radius.sm,
  },
});

globalStyle(`${logo} > span`, {
  minWidth: 0,
});

globalStyle(`${logo} [data-wordmark]`, {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const primaryLinks = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const rightSlot = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['1'],
  marginLeft: 'auto',
  flexShrink: 0,
});

export const iconLinkAnchorBase = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: vars.border.radius.base,
  color: '#fff',
  textDecoration: 'none',
  transition: `background ${vars.transitions.fast}`,
  ':hover': {
    background: 'rgba(255, 255, 255, 0.12)',
  },
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
  },
});

globalStyle(`${iconLinkAnchorBase} svg`, {
  fontSize: '1.375rem',
});

export const iconLinkAnchor = recipe({
  base: [iconLinkAnchorBase],
  variants: {
    active: {
      true: {
        background: 'rgba(255, 255, 255, 0.18)',
      },
      false: {
        background: 'transparent',
      },
    },
  },
  defaultVariants: { active: false },
});

export const badgeOverlay = style({
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  pointerEvents: 'none',
});

globalStyle(`${badgeOverlay} span[role='status']`, {
  minWidth: '18px',
  minHeight: '18px',
  padding: '0 5px',
  fontSize: '11px',
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: '0.02em',
  // The navbar gradient is the same rose in every theme (its icons are a fixed
  // white), so the badge uses fixed colours too: dark red on white is 7:1+ and
  // stands out from the bar, where the theme-aware inverse text was dark-on-red
  // in dark mode.
  background: '#ffffff',
  color: '#9f1239',
  border: '2px solid #be123c',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
});
