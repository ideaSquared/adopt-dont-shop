import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const spinAnimation = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

export const cardContainer = recipe({
  base: {
    position: 'absolute',
    width: '100%',
    maxWidth: '380px',
    height: '620px',
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.1)',
    userSelect: 'none',
    overflow: 'hidden',
    willChange: 'transform',
    touchAction: 'none',
    '@media': {
      '(max-width: 768px)': {
        maxWidth: 'min(92vw, 420px)',
        height: 'min(70vh, 640px)',
        borderRadius: '20px',
      },
    },
  },
  variants: {
    isTop: {
      true: { cursor: 'grab' },
      false: { cursor: 'default', pointerEvents: 'none' },
    },
    disabled: {
      true: { cursor: 'default' },
      false: {},
    },
  },
  defaultVariants: { isTop: false, disabled: false },
});

export const imageContainer = style({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: '#1a1a1a',
});

globalStyle(`${imageContainer} img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  color: 'white',
  textAlign: 'center',
});

globalStyle(`${placeholderImage} .placeholder-icon`, {
  fontSize: '80px',
  marginBottom: '20px',
  opacity: 0.9,
});

export const placeholderIconSpin = style({
  fontSize: '80px',
  marginBottom: '20px',
  animationName: spinAnimation,
  animationDuration: '2s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
});

export const placeholderText = style({
  fontSize: '1.5rem',
  fontWeight: 700,
  marginBottom: '8px',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
});

export const placeholderSubtext = style({
  fontSize: '1rem',
  opacity: 0.9,
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
});

/* Tap-zones for cycling images (left/right halves of upper card) */
export const tapZone = recipe({
  base: {
    position: 'absolute',
    top: 0,
    bottom: '35%',
    width: '40%',
    zIndex: 4,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  variants: {
    side: {
      left: { left: 0 },
      right: { right: 0 },
    },
  },
});

/* Image dots indicator */
export const imageDots = style({
  position: 'absolute',
  top: '12px',
  left: '12px',
  right: '12px',
  display: 'flex',
  gap: '4px',
  zIndex: 5,
  pointerEvents: 'none',
});

export const imageDot = recipe({
  base: {
    flex: 1,
    height: '3px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.4)',
    transition: 'background 0.2s ease',
  },
  variants: {
    active: {
      true: { background: 'rgba(255, 255, 255, 0.95)' },
      false: {},
    },
  },
});

/* Gradient overlay that fades image to dark at the bottom so text is readable */
export const gradientScrim = style({
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.85) 100%)',
  pointerEvents: 'none',
  zIndex: 1,
});

/* Corner stamps shown while dragging */
export const stamp = recipe({
  base: {
    position: 'absolute',
    top: '32px',
    padding: '8px 18px',
    border: '4px solid',
    borderRadius: '10px',
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    zIndex: 6,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  variants: {
    variant: {
      like: {
        right: '24px',
        color: '#22c55e',
        borderColor: '#22c55e',
        transform: 'rotate(15deg)',
      },
      pass: {
        left: '24px',
        color: '#ef4444',
        borderColor: '#ef4444',
        transform: 'rotate(-15deg)',
      },
      super_like: {
        top: '40%',
        left: '50%',
        marginLeft: '-90px',
        color: '#0ea5e9',
        borderColor: '#0ea5e9',
        transform: 'rotate(-8deg)',
      },
      info: {
        bottom: '40%',
        left: '50%',
        marginLeft: '-60px',
        color: '#f59e0b',
        borderColor: '#f59e0b',
      },
    },
  },
});

/* Top badges (sponsored, compatibility) */
export const topBadges = style({
  position: 'absolute',
  top: '24px',
  right: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  alignItems: 'flex-end',
  zIndex: 5,
  pointerEvents: 'none',
});

export const topBadge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  variants: {
    variant: {
      sponsored: {
        background: 'rgba(255, 255, 255, 0.92)',
        color: '#7c3aed',
      },
      match: {
        background: 'rgba(34, 197, 94, 0.92)',
        color: 'white',
      },
    },
  },
});

/* Bottom info layered over image */
export const cardContent = style({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '20px 22px 24px',
  color: 'white',
  zIndex: 2,
  pointerEvents: 'none',
});

export const nameRow = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '6px',
});

export const petName = style({
  fontSize: '2rem',
  fontWeight: 800,
  margin: 0,
  color: 'white',
  letterSpacing: '-0.02em',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  lineHeight: 1.1,
});

export const petAge = style({
  fontSize: '1.4rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.92)',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
});

export const metaRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '8px 12px',
  fontSize: '0.95rem',
  color: 'rgba(255, 255, 255, 0.95)',
  textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
  marginBottom: '8px',
});

export const metaItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
});

export const metaDot = style({
  width: '3px',
  height: '3px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.6)',
});

export const description = style({
  fontSize: '0.9rem',
  lineHeight: 1.4,
  color: 'rgba(255, 255, 255, 0.92)',
  textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
  marginTop: '6px',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const chipsRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '10px',
});

export const chip = recipe({
  base: {
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.18)',
    color: 'white',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
  },
  variants: {
    variant: {
      default: {},
      breed: { background: 'rgba(255, 255, 255, 0.22)' },
    },
  },
  defaultVariants: { variant: 'default' },
});

/* Info button (chevron) to expand details */
export const infoButton = style({
  position: 'absolute',
  right: '16px',
  bottom: '24px',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.18)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  fontSize: '1.4rem',
  pointerEvents: 'auto',
  zIndex: 5,
  transition: 'all 0.2s ease',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.28)',
    transform: 'translateY(-2px)',
  },
});

/* Login prompt overlay */
export const loginPromptOverlay = recipe({
  base: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(10px)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderRadius: '24px',
    textAlign: 'center',
    padding: '2rem',
  },
  variants: {
    show: {
      true: { display: 'flex' },
      false: { display: 'none' },
    },
  },
  defaultVariants: { show: false },
});

export const promptIcon = style({
  fontSize: '3.5rem',
  marginBottom: '1rem',
});

export const promptTitle = style({
  color: 'white',
  fontSize: '1.4rem',
  marginBottom: '0.5rem',
  fontWeight: 700,
});

export const promptText = style({
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '0.95rem',
  lineHeight: 1.5,
  marginBottom: '1.5rem',
  maxWidth: '280px',
});

export const promptButton = style({
  background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
  color: 'white',
  border: 'none',
  padding: '0.85rem 1.75rem',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 6px 20px rgba(78, 205, 196, 0.4)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(78, 205, 196, 0.5)',
  },
});
