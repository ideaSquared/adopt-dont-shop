import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const layoutContainer = style({
  display: 'flex',
  minHeight: '100vh',
  background: vars.background.body,
});

// The sidebar is a sticky, in-flow flex item, so it reserves its own width
// and the main column simply takes the remaining space. Do NOT reintroduce a
// margin-left keyed off the collapsed state — that double-counts the sidebar
// and leaves a dead gap beside the content.
export const mainColumn = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  // Constrain the main column so wide children (tables, charts) scroll
  // within their own containers rather than overflowing the viewport.
  minWidth: 0,
});

export const contentWrapper = style({
  flex: 1,
  width: '100%',
  padding: vars.spacing['5'],
  maxWidth: '1920px',
  margin: '0 auto',
  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
    },
  },
});

// ADS-497 (slice 5b): minimal footer strip carrying the "Manage cookies"
// link. Admin has no public legal-link footer today; this is the
// smallest surface that keeps the cookies-policy promise of an on-page
// withdrawal control.
export const layoutFooter = style({
  borderTop: `1px solid ${vars.border.color.muted}`,
  padding: '0.75rem 2rem',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.spacing['3'],
  background: vars.background.surface,
});
