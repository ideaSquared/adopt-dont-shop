import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const devToggle = style({
  position: 'fixed',
  top: '20px',
  right: '20px',
  zIndex: 10000,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  padding: '0.75rem 1.25rem',
  borderRadius: '12px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  boxShadow: '0 8px 25px -5px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backdropFilter: 'blur(10px)',
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 32px -5px rgba(102, 126, 234, 0.6)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
});

export const devPanel = recipe({
  base: {
    position: 'fixed',
    top: 0,
    width: '420px',
    height: '100vh',
    background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)',
    borderLeft: '1px solid #e2e8f0',
    boxShadow: '-20px 0 40px -10px rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
    transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(10px)',
  },
  variants: {
    isOpen: {
      open: { right: '0' },
      closed: { right: '-420px' },
    },
  },
  defaultVariants: { isOpen: 'closed' },
});

export const devHeader = style({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '1.5rem',
  fontWeight: 700,
  fontSize: '1.1rem',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
  position: 'relative',
  selectors: {
    '&::after': {
      content: "''",
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    },
  },
});

export const devContent = style({
  padding: '1.5rem',
  maxHeight: 'calc(100vh - 120px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#cbd5e1 transparent',
});

globalStyle(`${devContent}::-webkit-scrollbar`, { width: '6px' });
globalStyle(`${devContent}::-webkit-scrollbar-track`, { background: 'transparent' });
globalStyle(`${devContent}::-webkit-scrollbar-thumb`, {
  background: '#cbd5e1',
  borderRadius: '3px',
});
globalStyle(`${devContent}::-webkit-scrollbar-thumb:hover`, { background: '#94a3b8' });

export const userCard = style({
  display: 'block',
  width: '100%',
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '1.25rem',
  marginBottom: '1rem',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  textAlign: 'left',
  position: 'relative',
  overflow: 'hidden',
  selectors: {
    '&::before': {
      content: "''",
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      background: 'linear-gradient(to bottom, #667eea, #764ba2)',
      transform: 'scaleY(0)',
      transition: 'transform 0.3s ease',
    },
    '&:hover': {
      borderColor: '#667eea',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 25px -5px rgba(102, 126, 234, 0.25)',
    },
    '&:hover::before': {
      transform: 'scaleY(1)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      background: '#f1f5f9',
    },
    '&:disabled:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
});

export const userName = style({
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: '0.5rem',
  fontSize: '1rem',
  letterSpacing: '-0.025em',
});

export const userEmail = style({
  color: '#64748b',
  fontSize: '0.875rem',
  marginBottom: '0.5rem',
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
});

export const userDescription = style({
  color: '#475569',
  fontSize: '0.8rem',
  lineHeight: '1.4',
  fontStyle: 'italic',
  opacity: 0.9,
});

export const currentUserPanel = style({
  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
  border: '1px solid #86efac',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)',
});

globalStyle(`${currentUserPanel} h4`, {
  margin: '0 0 0.75rem 0',
  color: '#166534',
  fontSize: '1rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${currentUserPanel} h4::before`, {
  content: "'👤'",
  fontSize: '1.2rem',
});

export const logoutButton = style({
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginTop: '0.75rem',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
  selectors: {
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
});

export const warningBanner = style({
  background: 'linear-gradient(135deg, #fef3c7 0%, #fef7cd 100%)',
  color: '#92400e',
  padding: '1rem',
  borderRadius: '12px',
  fontSize: '0.875rem',
  marginBottom: '1.5rem',
  border: '1px solid #fbbf24',
  boxShadow: '0 4px 12px rgba(251, 191, 36, 0.15)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  selectors: {
    '&::before': {
      content: "'⚠️'",
      fontSize: '1.2rem',
    },
  },
});
