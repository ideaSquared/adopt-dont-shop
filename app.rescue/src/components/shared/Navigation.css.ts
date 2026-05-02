import { globalStyle, style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const mainNavigation = style({
  width: '280px',
  minWidth: '280px',
  height: '100vh',
  background: `linear-gradient(180deg, ${vars.colors.primary['600']} 0%, ${vars.colors.primary['800']} 100%)`,
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  overflowY: 'auto',
});

export const navHeader = style({
  padding: '2rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
});

globalStyle(`${navHeader} h2`, {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: '600',
});

export const navList = style({
  flex: 1,
  listStyle: 'none',
  padding: '1rem 0',
  margin: 0,
});

export const navItem = style({
  margin: '0.25rem 0',
});

export const navLink = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    color: 'rgba(255, 255, 255, 0.8)',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    borderRadius: '0 25px 25px 0',
    marginRight: '1rem',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        color: 'white',
        fontWeight: '600',
      },
      false: {},
    },
    hasUnread: {
      true: {
        color: 'white',
        fontWeight: '600',
      },
      false: {},
    },
  },
});

export const navIcon = style({
  fontSize: '1.25rem',
  marginRight: '0.75rem',
  width: '1.5rem',
  textAlign: 'center',
});

export const navLabel = style({
  fontSize: '0.95rem',
  flex: 1,
});

const badgePulse = keyframes({
  '0%': {
    boxShadow: `0 0 0 0 color-mix(in srgb, ${vars.colors.semantic.error['500']} 60%, transparent)`,
  },
  '70%': { boxShadow: '0 0 0 7px transparent' },
  '100%': { boxShadow: '0 0 0 0 transparent' },
});

export const navBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '22px',
  height: '22px',
  padding: '0 7px',
  borderRadius: '11px',
  background: vars.colors.semantic.error['500'],
  color: vars.text.inverse,
  fontSize: '0.75rem',
  fontWeight: '700',
  lineHeight: '1',
  marginLeft: '0.5rem',
  animation: `${badgePulse} 2s ease-out infinite`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});

export const navFooter = style({
  padding: '1.5rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
});

export const userInfo = style({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const userAvatar = style({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '0.75rem',
  fontSize: '1.25rem',
});

export const userDetails = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

export const userName = style({
  fontWeight: '600',
  fontSize: '0.9rem',
});

export const userRole = style({
  fontSize: '0.75rem',
  opacity: 0.8,
});

export const logoutButton = style({
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'all 0.2s ease',
  width: '100%',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.2)',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});
