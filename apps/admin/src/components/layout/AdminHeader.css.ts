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
  background: vars.background.surface,
  borderBottom: `1px solid ${vars.border.color.muted}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `0 ${vars.spacing['5']}`,
  position: 'sticky',
  top: 0,
  zIndex: 90,
  gap: vars.spacing['3'],
  '@media': {
    [MOBILE]: {
      padding: `0 ${vars.spacing['3']}`,
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
  gap: vars.spacing['3'],
});

export const userButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: 'transparent',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.muted,
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
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
});

export const userRole = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
  textTransform: 'capitalize',
});
