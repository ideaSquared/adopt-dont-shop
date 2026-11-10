import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';
import { SIDEBAR_MOBILE_MAX_WIDTH } from '@adopt-dont-shop/lib.components';

// Must match NavSidebar's drawer breakpoint. Below this the sidebar is
// off-canvas and the hamburger trigger takes over.
const MOBILE = `(max-width: ${SIDEBAR_MOBILE_MAX_WIDTH})`;

// Sticky rather than fixed: the header is a flow child of the main column, so
// it spans exactly the space left by the sidebar without tracking the sidebar
// width itself. This is why there is no `left` offset and no collapsed-state
// variant here — reintroducing either re-couples the header to the sidebar.
export const headerContainer = style({
  height: '80px',
  flexShrink: 0,
  background: '#ffffff',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 2rem',
  position: 'sticky',
  top: 0,
  zIndex: 90,
  gap: '1rem',
  '@media': {
    [MOBILE]: {
      padding: '0 1rem',
    },
  },
});

// Hamburger trigger for the off-canvas sidebar drawer. Hidden on desktop,
// where the sidebar is always visible.
export const mobileMenu = style({
  display: 'none',
  '@media': {
    [MOBILE]: {
      display: 'flex',
    },
  },
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const userButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem 1rem',
  background: 'transparent',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    borderColor: vars.colors.primary,
  },
});

export const userInfo = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  // The name/role labels are dropped on phones; the avatar alone is enough.
  '@media': {
    '(max-width: 480px)': {
      display: 'none',
    },
  },
});

export const userName = style({
  fontWeight: '600',
  fontSize: '0.875rem',
  color: '#111827',
});

export const userRole = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  textTransform: 'capitalize',
});
