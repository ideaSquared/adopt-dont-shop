import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  minHeight: '100vh',
  padding: `${vars.spacing['5']} 0`,
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: vars.spacing['5'],
  marginBottom: vars.spacing['6'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: vars.spacing['4'],
    },
  },
});

export const ctaButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  background: vars.colors.primary,
  color: 'white',
  padding: '0.8rem 1.5rem',
  borderRadius: vars.border.radius.lg,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
  boxShadow: vars.shadows.sm,
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.colors.primaryHover,
    boxShadow: vars.shadows.base,
    transform: 'translateY(-1px)',
  },
});

export const loginPrompt = style({
  textAlign: 'center',
  padding: `${vars.spacing['7']} ${vars.spacing['5']}`,
  background: vars.background.muted,
  borderRadius: vars.border.radius['2xl'],
  margin: `${vars.spacing['5']} 0`,
});

globalStyle(`${loginPrompt} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.8rem',
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
});

globalStyle(`${loginPrompt} p`, {
  fontSize: '1.1rem',
  color: vars.text.secondary,
  marginBottom: vars.spacing['5'],
  lineHeight: '1.6',
});

export const statsContainer = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing['5'],
  marginBottom: vars.spacing['6'],
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      gap: vars.spacing['3'],
    },
  },
});

export const statCard = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  textAlign: 'center',
  minWidth: '120px',
  boxShadow: vars.shadows.sm,
});

globalStyle(`${statCard} .number`, {
  fontFamily: vars.typography.family.display,
  fontSize: '2rem',
  fontWeight: vars.typography.weight.bold,
  color: vars.colors.primaryHover,
  marginBottom: vars.spacing['2'],
});

globalStyle(`${statCard} .label`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const errorAlert = style({
  margin: `${vars.spacing['5']} 0`,
});
