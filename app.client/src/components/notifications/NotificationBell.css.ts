import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const bellRing = keyframes({
  '0%, 50%, 100%': { transform: 'rotate(0deg)' },
  '10%, 30%': { transform: 'rotate(-10deg)' },
  '20%, 40%': { transform: 'rotate(10deg)' },
});

export const pulseGlow = keyframes({
  '0%, 100%': {
    boxShadow: '0 0 5px rgba(255, 64, 129, 0.3)',
    transform: 'scale(1)',
  },
  '50%': {
    boxShadow: '0 0 15px rgba(255, 64, 129, 0.6)',
    transform: 'scale(1.05)',
  },
});

export const notificationContainer = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
});

export const notificationButton = recipe({
  base: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '1.25rem',
    overflow: 'visible',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(-1px)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
    '@media': {
      '(max-width: 768px)': {
        padding: '0.6rem',
        fontSize: '1.1rem',
      },
    },
  },
  variants: {
    hasUnread: {
      true: {
        animationName: pulseGlow,
        animationDuration: '2s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      },
      false: {},
    },
  },
  defaultVariants: { hasUnread: false },
});

export const notificationIcon = style({
  // Used to target the icon for animation via selectors on the parent
});

export const notificationBadge = style({
  position: 'absolute',
  top: '-10px',
  right: '-10px',
  background: 'linear-gradient(45deg, #ff4444, #ff6b6b)',
  color: 'white',
  borderRadius: '50%',
  minWidth: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 700,
  border: '3px solid white',
  boxShadow: '0 4px 16px rgba(255, 68, 68, 0.5)',
  animationName: pulseGlow,
  animationDuration: '1.5s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  zIndex: 20,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
  '::before': {
    content: '""',
    position: 'absolute',
    inset: '-3px',
    borderRadius: 'inherit',
    background: 'linear-gradient(45deg, #ff4444, #ff6b6b)',
    zIndex: -1,
    filter: 'blur(6px)',
    opacity: 0.7,
  },
});

export const dropdownContainer = recipe({
  base: {
    position: 'absolute',
    top: 'calc(100% + 16px)',
    right: 0,
    zIndex: 1001,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'top right',
    '@media': {
      '(min-width: 769px)': {
        right: 0,
        maxWidth: '90vw',
      },
      '(max-width: 768px)': {
        position: 'fixed',
        top: '70px',
        left: '1rem',
        right: '1rem',
        width: 'auto',
        transformOrigin: 'top center',
      },
    },
  },
  variants: {
    isOpen: {
      true: {
        opacity: 1,
        visibility: 'visible',
        transform: 'translateY(0) scale(1)',
      },
      false: {
        opacity: 0,
        visibility: 'hidden',
        transform: 'translateY(-10px) scale(0.95)',
      },
    },
  },
  defaultVariants: { isOpen: false },
});

export const overlay = recipe({
  base: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(2px)',
  },
  variants: {
    isOpen: {
      true: {
        opacity: 1,
        visibility: 'visible',
      },
      false: {
        opacity: 0,
        visibility: 'hidden',
      },
    },
  },
  defaultVariants: { isOpen: false },
});

export const quickPreview = style({
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  padding: '1.5rem',
  width: '420px',
  maxWidth: '90vw',
  marginBottom: '1rem',
  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
  backdropFilter: 'blur(8px)',
  '@media': {
    '(max-width: 768px)': {
      width: 'calc(100vw - 2rem)',
      padding: '1.25rem',
    },
  },
});

export const previewHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
  paddingBottom: '0.75rem',
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

globalStyle(`${previewHeader} h3`, {
  fontSize: '1.1rem',
  fontWeight: 600,
  color: vars.text.primary,
  margin: 0,
});

export const viewAllButton = style({
  background: vars.colors.primary['500'],
  border: 'none',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.colors.primary['600'],
    transform: 'translateY(-1px)',
  },
  ':active': {
    transform: 'translateY(0)',
  },
});

export const quickNotificationItem = recipe({
  base: {
    padding: '1rem',
    borderRadius: '10px',
    border: `1px solid ${vars.border.color.primary}`,
    marginBottom: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      borderColor: vars.colors.primary['300'],
    },
    ':active': {
      transform: 'translateY(-1px)',
    },
    selectors: {
      '&:last-child': {
        marginBottom: 0,
      },
    },
  },
  variants: {
    isRead: {
      true: {
        background: vars.background.primary,
      },
      false: {
        background: vars.background.secondary,
        borderLeft: '3px solid transparent',
        paddingLeft: '1.25rem',
        '::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '60%',
          background: 'linear-gradient(45deg, #ff4444, #ff6b6b)',
          borderRadius: '0 2px 2px 0',
        },
      },
    },
  },
  defaultVariants: { isRead: true },
});

export const quickNotificationTitle = recipe({
  base: {
    fontSize: '0.925rem',
    color: vars.text.primary,
    marginBottom: '0.5rem',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  variants: {
    isRead: {
      true: {
        fontWeight: 'normal',
      },
      false: {
        fontWeight: 600,
      },
    },
  },
  defaultVariants: { isRead: true },
});

export const quickNotificationMessage = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  marginBottom: '0.5rem',
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const quickNotificationTime = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
});

export const emptyState = style({
  textAlign: 'center',
  padding: '1.5rem',
  color: vars.text.secondary,
  fontSize: '0.875rem',
});
