import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

// Slim top bar with the hamburger trigger. Only visible on mobile; the
// NavSidebar drawer itself carries the branding/footer on desktop.
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

// Footer content supplied to NavSidebar's `footer` slot: the signed-in user's
// avatar/name/role and the Sign Out button. NavSidebar styles the footer
// container; these style the app-specific content inside it.
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
