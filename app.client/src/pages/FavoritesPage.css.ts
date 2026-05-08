import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  minHeight: '100vh',
  padding: '2rem 0',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '3rem',
});

globalStyle(`${header} h1`, {
  fontFamily: vars.typography.family.display,
  fontSize: '2.5rem',
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
  marginBottom: '1rem',
  letterSpacing: '-0.025em',
});

globalStyle(`${header} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: '1.6',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '2rem',
  marginBottom: '3rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
    },
  },
});

export const emptyState = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  background: vars.background.tertiary,
  borderRadius: vars.border.radius['2xl'],
  margin: '2rem 0',
});

globalStyle(`${emptyState} .emoji`, {
  fontSize: '4rem',
  marginBottom: '1rem',
  display: 'block',
});

globalStyle(`${emptyState} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.8rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

globalStyle(`${emptyState} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  marginBottom: '2rem',
  lineHeight: '1.6',
});

export const ctaButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: vars.colors.primary['500'],
  color: 'white',
  padding: '0.8rem 1.5rem',
  borderRadius: vars.border.radius.lg,
  textDecoration: 'none',
  fontWeight: '500',
  boxShadow: vars.shadows.sm,
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.colors.primary['600'],
    boxShadow: vars.shadows.md,
    transform: 'translateY(-1px)',
  },
});

export const loginPrompt = style({
  textAlign: 'center',
  padding: '4rem 2rem',
  background: vars.background.tertiary,
  borderRadius: vars.border.radius['2xl'],
  margin: '2rem 0',
});

globalStyle(`${loginPrompt} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.8rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

globalStyle(`${loginPrompt} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  marginBottom: '2rem',
  lineHeight: '1.6',
});

export const statsContainer = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '2rem',
  marginBottom: '3rem',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      gap: '1rem',
    },
  },
});

export const statCard = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.lg,
  padding: '1.5rem',
  textAlign: 'center',
  minWidth: '120px',
  boxShadow: vars.shadows.sm,
});

globalStyle(`${statCard} .number`, {
  fontFamily: vars.typography.family.display,
  fontSize: '2rem',
  fontWeight: vars.typography.weight.bold,
  color: vars.colors.primary['600'],
  marginBottom: '0.5rem',
});

globalStyle(`${statCard} .label`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const errorAlert = style({
  margin: '2rem 0',
});

export const ctaButtonGreen = style({
  background: '#48bb78',
  ':hover': {
    background: '#38a169',
  },
});

export const ctaButtonRow = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'center',
  flexWrap: 'wrap',
});
