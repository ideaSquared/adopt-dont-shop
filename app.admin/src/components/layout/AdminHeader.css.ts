import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerContainer = recipe({
  base: {
    height: '80px',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'fixed',
    top: 0,
    right: 0,
    zIndex: 90,
    transition: 'left 0.3s ease',
  },
  variants: {
    sidebarCollapsed: {
      true: { left: '80px' },
      false: { left: '280px' },
    },
  },
});

export const searchContainer = style({
  flex: 1,
  maxWidth: '500px',
  position: 'relative',
});

export const searchInput = style({
  width: '100%',
  padding: '0.75rem 1rem 0.75rem 2.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: '#f9fafb',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
    background: '#ffffff',
    boxShadow: `0 0 0 3px ${vars.colors.primary['100']}`,
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const searchIcon = style({
  position: 'absolute',
  left: '1rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  fontSize: '1rem',
  pointerEvents: 'none',
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const iconButton = recipe({
  base: {
    position: 'relative',
    background: 'transparent',
    border: '1px solid #d1d5db',
    padding: '0.625rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f9fafb',
      borderColor: vars.colors.primary['500'],
      color: vars.colors.primary['600'],
    },
  },
  variants: {
    hasNotification: {
      true: {
        selectors: {
          '&::after': {
            content: "''",
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            background: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #ffffff',
          },
        },
      },
      false: {},
    },
  },
});

globalStyle(`${iconButton.classNames.base} svg`, {
  fontSize: '1.25rem',
});

export const userMenu = style({
  position: 'relative',
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
    borderColor: vars.colors.primary['500'],
  },
});

export const userAvatar = style({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: vars.colors.primary['500'],
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  fontSize: '0.875rem',
});

export const userInfo = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
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

export const dropdownMenu = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    width: '220px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  variants: {
    isOpen: {
      true: { display: 'block' },
      false: { display: 'none' },
    },
  },
});

export const dropdownItem = recipe({
  base: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  variants: {
    danger: {
      true: {
        color: '#ef4444',
        ':hover': { background: '#fef2f2' },
      },
      false: {
        color: '#111827',
        ':hover': { background: '#f9fafb' },
      },
    },
  },
});

globalStyle(`${dropdownItem.classNames.base} svg`, {
  fontSize: '1rem',
});

export const dropdownDivider = style({
  height: '1px',
  background: '#e5e7eb',
  margin: '0.25rem 0',
});
