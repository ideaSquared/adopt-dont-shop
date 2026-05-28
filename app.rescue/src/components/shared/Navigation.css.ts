import { globalStyle, style, keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const mainNavigation = style({
  width: '280px',
  minWidth: '280px',
  height: '100vh',
  background: `linear-gradient(180deg, ${vars.colors.primaryHover} 0%, ${vars.colors.primaryTextEmphasis} 100%)`,
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  overflowY: 'auto',
  '@media': {
    // Below the md breakpoint the sidebar becomes an off-canvas drawer so it
    // no longer eats most of the viewport. It slides in from the left when
    // opened via the hamburger button in the mobile bar.
    '(max-width: 768px)': {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1001,
      maxWidth: '85vw',
      transform: 'translateX(-100%)',
      transition: 'transform 0.25s ease',
      boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)',
    },
  },
});

export const mainNavigationOpen = style({
  '@media': {
    '(max-width: 768px)': {
      transform: 'translateX(0)',
    },
  },
});

// Slim top bar with the hamburger trigger. Only visible on mobile; the
// drawer itself carries the branding/footer on desktop.
export const mobileBar = style({
  display: 'none',
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: vars.colors.primaryTextEmphasis,
      color: 'white',
    },
  },
});

export const mobileMenuButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '44px',
  height: '44px',
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: '1.5rem',
  lineHeight: 1,
  cursor: 'pointer',
  borderRadius: '6px',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.1)',
  },
});

export const mobileCloseButton = style({
  display: 'none',
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '44px',
      height: '44px',
      background: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '1.25rem',
      lineHeight: 1,
      cursor: 'pointer',
      borderRadius: '6px',
      ':hover': {
        background: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
});

export const mobileOverlay = style({
  display: 'none',
  '@media': {
    '(max-width: 768px)': {
      display: 'block',
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.5)',
    },
  },
});

export const navHeader = style({
  padding: '2rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.5rem',
    },
  },
});

globalStyle(`${navHeader} h2`, {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: '600',
});

export const navList = style({
  flex: 1,
  padding: '1rem 0',
  margin: 0,
});

export const navGroup = style({
  margin: '0.75rem 0',
});

export const navGroupLabel = style({
  margin: 0,
  padding: '0 1.5rem 0.25rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255, 255, 255, 0.55)',
});

export const navGroupList = style({
  listStyle: 'none',
  padding: 0,
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
    boxShadow: `0 0 0 0 color-mix(in srgb, ${vars.colors.danger} 60%, transparent)`,
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
  background: vars.colors.danger,
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
