import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const styledCard = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  cursor: 'pointer',
  textDecoration: 'none',
  color: 'inherit',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
  },
});

export const imageContainer = style({
  position: 'relative',
  height: '200px',
  overflow: 'hidden',
  borderRadius: '8px 8px 0 0',
});

globalStyle(`${imageContainer} img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.3s ease',
});

globalStyle(`${imageContainer}:hover img`, {
  transform: 'scale(1.05)',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '60px',
    height: '60px',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: 0.3,
  },
  '::after': {
    content: '"No Photo Available"',
    position: 'absolute',
    bottom: '20px',
    fontSize: '0.9rem',
    opacity: 0.8,
    color: '#666',
  },
});

export const favoriteButton = style({
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'rgba(255, 255, 255, 0.9)',
  border: 'none',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: 'white',
    transform: 'scale(1.1)',
  },
});

globalStyle(`${favoriteButton} svg`, {
  width: '20px',
  height: '20px',
});

export const statusBadge = style({
  position: 'absolute',
  top: '12px',
  left: '12px',
});

export const cardContent = style({
  padding: '1.5rem',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
});

export const petName = style({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

export const petDetails = style({
  marginBottom: '1rem',
  flexGrow: 1,
});

export const detailRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '0.25rem',
  fontSize: '0.9rem',
});

export const detailLabel = style({
  color: vars.text.secondary,
});

export const detailValue = style({
  fontWeight: 500,
  color: vars.text.primary,
});

export const description = style({
  fontSize: '0.9rem',
  color: vars.text.secondary,
  lineHeight: 1.4,
  marginBottom: '1rem',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const cardActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: 'auto',
});

export const rescueInfo = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  marginBottom: '1rem',
  paddingTop: '0.5rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
});

export const distanceBadge = style({
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.2rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  borderRadius: '9999px',
  padding: '0.25rem 0.6rem 0.25rem 0.45rem',
  letterSpacing: '0.01em',
  pointerEvents: 'none',
});

globalStyle(`${distanceBadge} svg`, {
  flexShrink: 0,
  color: '#6ee7b7',
});
