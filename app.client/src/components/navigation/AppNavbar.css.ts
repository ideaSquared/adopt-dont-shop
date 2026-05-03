import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const navbarContainer = style({
  background: vars.colors.gradients.primary,
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  boxShadow: vars.shadows.md,
});

export const navContent = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `0 ${vars.spacing['4']}`,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['4'],
  height: '64px',
  '@media': {
    '(max-width: 768px)': {
      height: '56px',
      padding: `0 ${vars.spacing['3']}`,
      gap: vars.spacing['2'],
    },
  },
});

export const logo = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.lg,
  fontWeight: 700,
  color: '#fff',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  ':focus-visible': {
    outline: '2px solid rgba(255, 255, 255, 0.8)',
    outlineOffset: '2px',
    borderRadius: vars.border.radius.sm,
  },
});

export const logoIcon = style({
  fontSize: '1.75rem',
  lineHeight: 1,
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
});

export const iconLinkAnchorBase = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: vars.border.radius.md,
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
  background: vars.colors.semantic.error['600'],
  color: vars.text.inverse,
  border: `2px solid ${vars.colors.primary['700']}`,
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
});
