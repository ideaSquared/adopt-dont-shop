import { keyframes, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

const shimmer = keyframes({
  '0%': { backgroundPosition: '-400px 0' },
  '100%': { backgroundPosition: '400px 0' },
});

export const stackContainer = style({
  position: 'relative',
  width: '100%',
  maxWidth: '420px',
  height: '640px',
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '@media': {
    '(max-width: 768px)': {
      height: 'min(70vh, 660px)',
      maxWidth: 'min(92vw, 420px)',
    },
  },
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  textAlign: 'center',
  color: '#475569',
  padding: vars.spacing['5'],
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  borderRadius: vars.border.radius['2xl'],
  border: '2px dashed #cbd5e1',
});

export const emptyIcon = style({
  fontSize: '4rem',
  marginBottom: vars.spacing['3'],
  opacity: 0.7,
});

export const emptyTitle = style({
  fontSize: '1.4rem',
  fontWeight: vars.typography.weight.bold,
  marginBottom: vars.spacing['2'],
  color: '#1e293b',
});

export const emptyText = style({
  fontSize: '0.95rem',
  lineHeight: 1.5,
  maxWidth: '320px',
  color: '#64748b',
});

// ADS-C5: screen-reader-only live region + visually-hidden text used by the
// accessible controls. Standard clip technique keeps it in the a11y tree.
export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

// ADS-C5: keyboard/AT-operable alternative to the swipe gestures. The group is
// hidden off-screen until one of its buttons receives focus, at which point it
// is revealed (the SkipLink reveal pattern) so keyboard users see the controls
// and screen-reader users can operate like/skip without gestures.
export const accessibleControls = style({
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  zIndex: 20,
  selectors: {
    '&:focus-within': {
      left: '50%',
      top: '0.75rem',
      transform: 'translateX(-50%)',
      width: 'auto',
      height: 'auto',
      display: 'flex',
      gap: vars.spacing['2'],
      padding: '0.5rem 0.75rem',
      background: vars.background.surface,
      borderRadius: vars.border.radius.base,
      boxShadow: vars.shadows.lg,
      border: `1px solid ${vars.border.color.default}`,
    },
  },
});

export const accessibleControlButton = style({
  padding: '0.5rem 0.875rem',
  minHeight: '44px',
  minWidth: '44px',
  borderRadius: vars.border.radius.base,
  border: `1px solid ${vars.border.color.default}`,
  background: vars.background.body,
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  cursor: 'pointer',
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.colors.primary}`,
      outlineOffset: '2px',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
});

export const skeletonCard = style({
  position: 'absolute',
  width: '100%',
  maxWidth: '380px',
  height: '620px',
  borderRadius: vars.border.radius['2xl'],
  background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 40%, #f1f5f9 80%)',
  backgroundSize: '800px 100%',
  animationName: shimmer,
  animationDuration: '1.4s',
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
  boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.18)',
  '@media': {
    '(max-width: 768px)': {
      maxWidth: 'min(92vw, 420px)',
      height: 'min(70vh, 640px)',
    },
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});
