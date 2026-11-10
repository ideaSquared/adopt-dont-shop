import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: vars.spacing['5'],
});

export const applicationGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: vars.spacing['4'],
});

export const applicationCard = style({
  padding: vars.spacing['4'],
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
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
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
    fontSize: vars.typography.size.xs,
  },
]);

export const rescueName = style({
  margin: '0',
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
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
  gap: vars.spacing['2'],
});

export const petDetailsH3 = style({
  margin: `0 0 ${vars.spacing['1']} 0`,
  fontFamily: vars.typography.family.display,
  fontSize: vars.typography.size.xl,
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
  fontSize: vars.typography.size.sm,
});

export const applicationDetails = style({
  marginTop: vars.spacing['3'],
});

globalStyle(`${applicationDetails} p`, {
  margin: `${vars.spacing['2']} 0`,
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.75rem',
  marginTop: vars.spacing['3'],
});

export const emptyState = style({
  textAlign: 'center',
  padding: `${vars.spacing['7']} ${vars.spacing['5']}`,
});

globalStyle(`${emptyState} h2`, {
  color: vars.text.secondary,
  marginBottom: vars.spacing['3'],
});

globalStyle(`${emptyState} p`, {
  color: vars.text.tertiary,
  marginBottom: vars.spacing['5'],
});
