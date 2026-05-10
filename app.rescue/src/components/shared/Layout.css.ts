import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const appLayout = style({
  display: 'flex',
  minHeight: '100vh',
  background: vars.background.primary,
});

export const mainColumn = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
});

export const mainContent = style({
  flex: 1,
  overflow: 'auto',
  padding: '2rem',
});

// ADS-497 (slice 5b): minimal footer strip carrying the "Manage cookies"
// link. Rescue has no public legal-link footer today; this is the
// smallest surface that keeps the cookies-policy promise of an on-page
// withdrawal control.
export const layoutFooter = style({
  borderTop: `1px solid ${vars.border.color.primary}`,
  padding: '0.75rem 2rem',
  display: 'flex',
  justifyContent: 'flex-end',
  background: vars.background.secondary,
});
