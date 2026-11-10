import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const applicationGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '1.5rem',
});

export const applicationCard = style({
  padding: '1.5rem',
  cursor: 'pointer',
  transition: `transform ${vars.transitions.fast}, box-shadow ${vars.transitions.fast}`,
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: vars.shadows.lg,
  },
});

export const petInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
});

export const petThumbnail = style({
  width: '64px',
  height: '64px',
  borderRadius: vars.border.radius.base,
  objectFit: 'cover',
  flexShrink: 0,
  background: vars.background.muted,
});

export const petThumbnailPlaceholder = style([
  petThumbnail,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: vars.text.muted,
    fontSize: '0.75rem',
  },
]);

export const rescueName = style({
  margin: '0',
  color: vars.text.secondary,
  fontSize: '0.875rem',
  fontWeight: vars.typography.weight.medium,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
});

export const cardTopRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '0.5rem',
});

export const petDetailsH3 = style({
  margin: '0 0 0.25rem 0',
  fontFamily: vars.typography.family.display,
  fontSize: '1.25rem',
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
});

export const petDetailsP = style({
  margin: '0',
  color: vars.text.tertiary,
  fontSize: '0.875rem',
});

export const applicationDetails = style({
  marginTop: '1rem',
});

globalStyle(`${applicationDetails} p`, {
  margin: '0.5rem 0',
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
});

globalStyle(`${emptyState} h2`, {
  color: vars.text.secondary,
  marginBottom: '1rem',
});

globalStyle(`${emptyState} p`, {
  color: vars.text.tertiary,
  marginBottom: '2rem',
});
