import { keyframes, style } from '@vanilla-extract/css';

const float = keyframes({
  '0%, 100%': { transform: 'translateY(0px)' },
  '50%': { transform: 'translateY(-20px)' },
});

const pulse = keyframes({
  '0%, 100%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(1.05)' },
});

const shimmer = keyframes({
  '0%': { backgroundPosition: '-200px 0' },
  '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
});

const floatIcon = keyframes({
  '0%, 100%': { transform: 'translateY(0px)' },
  '50%': { transform: 'translateY(-20px)' },
});

export const heroContainer = style({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  position: 'relative',
  overflow: 'hidden',
  padding: '4rem 0 5rem',
  color: 'white',
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="10" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="90" r="2.5" fill="rgba(255,255,255,0.1)"/><circle cx="60" cy="30" r="1.2" fill="rgba(255,255,255,0.1)"/></svg>\')',
    opacity: 0.6,
    animationName: float,
    animationDuration: '20s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  '@media': {
    '(max-width: 768px)': {
      padding: '3rem 0 4rem',
    },
  },
});

export const heroContent = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  textAlign: 'center',
  position: 'relative',
  zIndex: 1,
  '@media': {
    '(max-width: 768px)': {
      padding: '0 1rem',
    },
  },
});

export const mainHeading = style({
  fontSize: '3.5rem',
  fontWeight: 800,
  marginBottom: '1.5rem',
  lineHeight: 1.2,
  background: 'linear-gradient(45deg, #ffffff, #f8f9fa)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2.5rem',
      marginBottom: '1rem',
    },
    '(max-width: 480px)': {
      fontSize: '2rem',
    },
  },
});

export const subtitle = style({
  fontSize: '1.25rem',
  marginBottom: '3rem',
  opacity: 0.9,
  maxWidth: '600px',
  marginLeft: 'auto',
  marginRight: 'auto',
  lineHeight: 1.6,
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1.1rem',
      marginBottom: '2rem',
    },
  },
});

export const ctaContainer = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '3rem',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      gap: '0.75rem',
    },
  },
});

export const primaryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.75rem',
  background: 'linear-gradient(45deg, #ff4081, #ff6ec7)',
  color: 'white',
  padding: '1rem 2rem',
  borderRadius: '50px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '1.1rem',
  boxShadow: '0 8px 30px rgba(255, 64, 129, 0.3)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  animationName: pulse,
  animationDuration: '3s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  '::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-200px',
    width: '200px',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
    animationName: shimmer,
    animationDuration: '3s',
    animationIterationCount: 'infinite',
  },
  ':hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 40px rgba(255, 64, 129, 0.4)',
    animationName: 'none',
  },
  '@media': {
    '(max-width: 768px)': {
      padding: '0.875rem 1.75rem',
      fontSize: '1rem',
      width: '100%',
      maxWidth: '280px',
      justifyContent: 'center',
    },
  },
});

export const primaryButtonIcon = style({
  fontSize: '1.5rem',
  animationName: floatIcon,
  animationDuration: '2s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export const secondaryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  padding: '1rem 2rem',
  borderRadius: '50px',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '1rem',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.3s ease',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.25)',
    transform: 'translateY(-2px)',
  },
  '@media': {
    '(max-width: 768px)': {
      padding: '0.875rem 1.75rem',
      width: '100%',
      maxWidth: '280px',
      justifyContent: 'center',
    },
  },
});

export const featureCards = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '2rem',
  marginTop: '2rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
    },
  },
});

export const featureCard = style({
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
  padding: '2rem',
  textAlign: 'center',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  ':hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  },
  selectors: {
    '& .icon': {
      fontSize: '3rem',
      marginBottom: '1rem',
      color: '#ff4081',
      display: 'block',
    },
    '& h3': {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '0.75rem',
    },
    '& p': {
      opacity: 0.8,
      lineHeight: 1.5,
    },
  },
});

export const swipeBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  padding: '0.5rem 1rem',
  borderRadius: '50px',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '1rem',
  color: '#ffd700',
});

export const sparkle = style({
  animationName: floatIcon,
  animationDuration: '1.5s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});
