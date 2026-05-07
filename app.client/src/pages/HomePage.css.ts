import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '0 1rem',
    },
  },
});

export const section = style({
  padding: '4rem 0',
  '@media': {
    '(max-width: 768px)': {
      padding: '3rem 0',
    },
  },
});

globalStyle(`${section} h2`, {
  textAlign: 'center',
  fontSize: vars.typography.size['4xl'],
  marginBottom: vars.spacing[12],
  color: vars.text.primary,
});

export const heroSection = style({
  position: 'relative',
  overflow: 'hidden',
  padding: `${vars.spacing[20]} 0`,
  background: vars.colors.gradients.brand,
  color: vars.colors.neutral[50],
  textAlign: 'center',
  '@media': {
    '(max-width: 768px)': {
      padding: `${vars.spacing[16]} 0`,
    },
  },
});

export const heroGlow = style({
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(80% 60% at 70% 30%, rgba(255,255,255,0.18), transparent 60%)',
  pointerEvents: 'none',
});

export const heroInner = style({
  position: 'relative',
});

export const heroEyebrow = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.spacing[2],
  padding: `${vars.spacing[2]} ${vars.spacing[4]}`,
  borderRadius: vars.border.radius.full,
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.35)',
  backdropFilter: 'blur(4px)',
  color: 'white',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing[4],
});

export const heroTitle = style({
  fontFamily: vars.typography.family.display,
  fontSize: '3.5rem',
  fontWeight: vars.typography.weight.bold,
  lineHeight: 1.05,
  letterSpacing: '-0.03em',
  margin: `${vars.spacing[2]} 0 ${vars.spacing[4]}`,
  color: 'white',
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2.5rem',
    },
  },
});

export const heroSubtitle = style({
  fontSize: vars.typography.size.xl,
  lineHeight: vars.typography.lineHeight.normal,
  color: 'rgba(255,255,255,0.92)',
  maxWidth: '560px',
  margin: '0 auto',
  marginBottom: vars.spacing[8],
});

export const heroActions = style({
  display: 'flex',
  gap: vars.spacing[3],
  justifyContent: 'center',
  flexWrap: 'wrap',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '2rem',
  marginBottom: '3rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '1.5rem',
    },
  },
});

export const statsSection = style({
  backgroundColor: vars.background.tertiary,
  padding: '4rem 0',
});

globalStyle(`${statsSection} .stats-grid`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '2rem',
  textAlign: 'center',
});

globalStyle(`${statsSection} .stat-item h3`, {
  fontFamily: vars.typography.family.display,
  fontSize: '3rem',
  fontWeight: vars.typography.weight.bold,
  color: vars.colors.primary['600'],
  marginBottom: '0.5rem',
});

globalStyle(`${statsSection} .stat-item p`, {
  fontSize: '1.25rem',
  color: vars.text.secondary,
});

globalStyle(`${statsSection} .stat-item h3`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '2rem',
    },
  },
});

globalStyle(`${statsSection} .stat-item p`, {
  '@media': {
    '(max-width: 768px)': {
      fontSize: '1rem',
    },
  },
});

export const ctaSection = style({
  background: vars.colors.gradients.primary,
  color: vars.colors.neutral[50],
  padding: '4rem 0',
  textAlign: 'center',
});

globalStyle(`${ctaSection} h2`, {
  color: 'white',
  marginBottom: '1rem',
});

globalStyle(`${ctaSection} p`, {
  fontSize: '1.25rem',
  marginBottom: '2rem',
  maxWidth: '500px',
  marginLeft: 'auto',
  marginRight: 'auto',
  color: 'rgba(255,255,255,0.92)',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
});

export const errorMessage = style({
  textAlign: 'center',
  padding: '2rem',
  color: vars.text.error,
  backgroundColor: vars.background.error,
  borderRadius: vars.border.radius.lg,
  margin: '2rem 0',
});
