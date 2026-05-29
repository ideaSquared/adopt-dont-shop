import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const sidebarContainer = recipe({
  base: {
    height: '100vh',
    background: '#1f2937',
    color: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
    borderRight: '1px solid #374151',
    overflowY: 'auto',
    transition: 'width 0.3s ease, transform 0.3s ease',
    selectors: {
      '&::-webkit-scrollbar': {
        width: '6px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#4b5563',
        borderRadius: '3px',
      },
    },
    // On phones the sidebar is a full-width drawer that slides off-canvas
    // by default; the `mobileOpen` variant slides it back into view.
    '@media': {
      '(max-width: 768px)': {
        width: '280px',
        maxWidth: '85vw',
        transform: 'translateX(-100%)',
      },
    },
  },
  variants: {
    collapsed: {
      // The collapsed (icon-only) rail is a desktop affordance; on phones
      // the drawer always opens at full width regardless of this state.
      true: { width: '80px', '@media': { '(max-width: 768px)': { width: '280px' } } },
      false: { width: '280px' },
    },
    mobileOpen: {
      true: {
        '@media': {
          '(max-width: 768px)': {
            transform: 'translateX(0)',
          },
        },
      },
      false: {},
    },
  },
});

export const sidebarHeader = recipe({
  base: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #374151',
    minHeight: '80px',
  },
  variants: {
    collapsed: {
      true: { justifyContent: 'center' },
      false: { justifyContent: 'space-between' },
    },
  },
});

export const logo = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontWeight: '700',
    color: vars.colors.primary,
  },
  variants: {
    collapsed: {
      true: { fontSize: '1.5rem' },
      false: { fontSize: '1.25rem' },
    },
  },
});

export const toggleButton = style({
  background: 'transparent',
  border: '1px solid #4b5563',
  color: '#f9fafb',
  padding: '0.5rem',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#374151',
    borderColor: vars.colors.primary,
  },
  // The collapse/expand rail is a desktop-only affordance.
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

// Drawer-close button, shown only on phones where the sidebar is off-canvas.
export const mobileCloseButton = style({
  background: 'transparent',
  border: '1px solid #4b5563',
  color: '#f9fafb',
  padding: '0.5rem',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#374151',
    borderColor: vars.colors.primary,
  },
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
    },
  },
});

export const nav = style({
  flex: 1,
  padding: '1rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const navSection = recipe({
  base: {},
  variants: {
    collapsed: {
      true: { margin: '1rem 0' },
      false: { margin: '1rem 0 0.5rem 0' },
    },
  },
});

export const navSectionPadding = recipe({
  base: {},
  variants: {
    collapsed: {
      true: { padding: '0', '@media': { '(max-width: 768px)': { padding: '0 1rem' } } },
      false: { padding: '0 1rem' },
    },
  },
});

export const navSectionTitle = recipe({
  base: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
    marginBottom: '0.5rem',
    paddingLeft: '0.5rem',
  },
  variants: {
    collapsed: {
      true: { display: 'none', '@media': { '(max-width: 768px)': { display: 'block' } } },
      false: { display: 'block' },
    },
  },
});

export const navDivider = recipe({
  base: {
    height: '1px',
    background: '#374151',
  },
  variants: {
    collapsed: {
      true: { margin: '1rem 0.75rem' },
      false: { margin: '1rem 1rem' },
    },
  },
});

export const styledNavLinkBase = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  margin: '0 0.5rem',
  color: '#d1d5db',
  textDecoration: 'none',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  fontSize: '0.875rem',
  fontWeight: '500',
  position: 'relative',
  ':hover': {
    background: '#374151',
    color: '#ffffff',
  },
  selectors: {
    '&.active': {
      background: vars.colors.primaryHover,
      color: '#ffffff',
    },
    '&.active::before': {
      content: "''",
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '3px',
      height: '70%',
      background: vars.colors.primaryBorderSubtle,
      borderRadius: '0 2px 2px 0',
    },
  },
});

globalStyle(`${styledNavLinkBase} svg`, {
  fontSize: '1.25rem',
  minWidth: '1.25rem',
});

export const styledNavLink = recipe({
  base: [styledNavLinkBase],
  variants: {
    collapsed: {
      true: {
        padding: '0.75rem',
        justifyContent: 'center',
        '@media': {
          '(max-width: 768px)': {
            padding: '0.75rem 1rem',
            justifyContent: 'flex-start',
          },
        },
      },
      false: {
        padding: '0.75rem 1rem',
        justifyContent: 'flex-start',
      },
    },
  },
});

export const navLinkSpan = recipe({
  base: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  variants: {
    collapsed: {
      true: { display: 'none', '@media': { '(max-width: 768px)': { display: 'block' } } },
      false: { display: 'block' },
    },
  },
});

export const sidebarFooter = recipe({
  base: {
    padding: '1rem',
    borderTop: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  variants: {
    collapsed: {
      true: { alignItems: 'center' },
      false: { alignItems: 'stretch' },
    },
  },
});

export const footerText = recipe({
  base: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  variants: {
    collapsed: {
      true: { display: 'none', textAlign: 'center' },
      false: { display: 'block', textAlign: 'left' },
    },
  },
});

export const collapsedToggleRow = style({
  padding: '1rem 0',
  display: 'flex',
  justifyContent: 'center',
});

export const navBadge = style({
  marginLeft: 'auto',
  background: vars.colors.primary,
  color: '#ffffff',
  fontSize: '0.6875rem',
  fontWeight: '700',
  borderRadius: '9999px',
  padding: '0.125rem 0.5rem',
  minWidth: '1.25rem',
  textAlign: 'center',
  lineHeight: '1',
});
