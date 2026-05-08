import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const header = style({
  display: 'flex',
  justifyContent: 'between',
  alignItems: 'center',
  marginBottom: '2rem',
});

export const title = style({
  fontFamily: vars.typography.family.display,
  fontSize: '2rem',
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
  letterSpacing: '-0.025em',
  margin: '0',
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
  marginBottom: '1rem',
});

export const petDetailsH3 = style({
  margin: '0 0 0.25rem 0',
  fontFamily: vars.typography.family.display,
  fontSize: '1.25rem',
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const petDetailsP = style({
  margin: '0',
  color: vars.text.tertiary,
  fontSize: '0.875rem',
});

export const statusBadge = recipe({
  base: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: vars.border.radius.full,
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'white',
  },
  variants: {
    status: {
      submitted: { background: vars.colors.semantic.info['500'] },
      under_review: { background: vars.colors.semantic.warning['500'] },
      approved: { background: vars.colors.semantic.success['500'] },
      rejected: { background: vars.colors.semantic.error['500'] },
      default: { background: vars.colors.neutral['500'] },
    },
  },
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

export const loadingState = style({
  textAlign: 'center',
  padding: '4rem',
});
