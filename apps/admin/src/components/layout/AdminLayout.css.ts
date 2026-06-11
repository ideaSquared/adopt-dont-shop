import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const layoutContainer = style({
  display: 'flex',
  minHeight: '100vh',
  background: '#f3f4f6',
});

export const mainContent = recipe({
  base: {
    flex: 1,
    marginTop: '80px',
    transition: 'margin-left 0.3s ease',
    minHeight: 'calc(100vh - 80px)',
    // Constrain the main column so wide children (tables, charts) scroll
    // within their own containers rather than overflowing the viewport.
    minWidth: 0,
    '@media': {
      // On phones the sidebar becomes an off-canvas drawer, so the main
      // column spans the full width regardless of the collapsed state.
      '(max-width: 768px)': {
        marginLeft: 0,
      },
    },
  },
  variants: {
    sidebarCollapsed: {
      true: { marginLeft: '80px' },
      false: { marginLeft: '280px' },
    },
  },
});

// Backdrop shown behind the off-canvas sidebar drawer on small screens.
// Rendered only when the drawer is open; tapping it closes the drawer.
export const mobileBackdrop = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 99,
  display: 'none',
  '@media': {
    '(max-width: 768px)': {
      display: 'block',
    },
  },
});

export const contentWrapper = style({
  padding: '2rem',
  maxWidth: '1920px',
  margin: '0 auto',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

// ADS-497 (slice 5b): minimal footer strip carrying the "Manage cookies"
// link. Admin has no public legal-link footer today; this is the
// smallest surface that keeps the cookies-policy promise of an on-page
// withdrawal control.
export const layoutFooter = style({
  borderTop: '1px solid #e5e7eb',
  padding: '0.75rem 2rem',
  display: 'flex',
  justifyContent: 'flex-end',
  background: '#ffffff',
});
