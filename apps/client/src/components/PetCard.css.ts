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
  borderRadius: `${vars.border.radius.base} ${vars.border.radius.base} 0 0`,
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
  padding: vars.spacing['4'],
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
});

export const petName = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['2'],
  color: vars.text.primary,
});

export const petDetails = style({
  marginBottom: vars.spacing['3'],
  flexGrow: 1,
});

export const detailRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: vars.spacing['1'],
  fontSize: '0.9rem',
});

export const detailLabel = style({
  color: vars.text.secondary,
});

export const detailValue = style({
  fontWeight: vars.typography.weight.medium,
  color: vars.text.primary,
});

export const description = style({
  fontSize: '0.9rem',
  color: vars.text.secondary,
  lineHeight: 1.4,
  marginBottom: vars.spacing['3'],
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const cardActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  marginTop: 'auto',
});

export const rescueInfo = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  marginBottom: vars.spacing['3'],
  paddingTop: vars.spacing['2'],
  borderTop: `1px solid ${vars.border.color.default}`,
});

export const distanceBadge = style({
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.2rem',
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  borderRadius: vars.border.radius.pill,
  padding: '0.25rem 0.6rem 0.25rem 0.45rem',
  letterSpacing: '0.01em',
  pointerEvents: 'none',
});

globalStyle(`${distanceBadge} svg`, {
  flexShrink: 0,
  color: '#6ee7b7',
});

export const actionButton = style({
  flex: 1,
});
