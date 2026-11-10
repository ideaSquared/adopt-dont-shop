import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `0 ${vars.spacing['5']}`,
  '@media': {
    '(max-width: 768px)': {
      padding: `0 ${vars.spacing['3']}`,
    },
  },
});

export const section = style({
  padding: `${vars.spacing['7']} 0`,
  '@media': {
    '(max-width: 768px)': {
      padding: `${vars.spacing['6']} 0`,
    },
  },
});

globalStyle(`${section} h2`, {
  textAlign: 'center',
  fontSize: vars.typography.size['4xl'],
  marginBottom: vars.spacing['6'],
  color: vars.text.primary,
});

export const heroSection = style({
  position: 'relative',
  overflow: 'hidden',
  padding: `${vars.spacing['7']} 0`,
  background: vars.colors.gradientBrand,
  color: vars.background.body,
  textAlign: 'center',
  '@media': {
    '(max-width: 768px)': {
      padding: `${vars.spacing['7']} 0`,
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
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.pill,
  background: 'rgba(255,255,255,0.18)',
  border: '1px solid rgba(255,255,255,0.35)',
  backdropFilter: 'blur(4px)',
  color: 'white',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['3'],
});

export const heroTitle = style({
  fontFamily: vars.typography.family.display,
  fontSize: '3.5rem',
  fontWeight: vars.typography.weight.bold,
  lineHeight: 1.05,
  letterSpacing: '-0.03em',
  margin: `${vars.spacing['2']} 0 ${vars.spacing['3']}`,
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
  marginBottom: vars.spacing['5'],
});

export const heroActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'center',
  flexWrap: 'wrap',
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.spacing['5'],
  marginBottom: vars.spacing['6'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: vars.spacing['4'],
    },
  },
});

export const statsSection = style({
  backgroundColor: vars.background.muted,
  padding: `${vars.spacing['7']} 0`,
});

globalStyle(`${statsSection} .stats-grid`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['5'],
  textAlign: 'center',
});

globalStyle(`${statsSection} .stat-item h3`, {
  fontFamily: vars.typography.family.display,
  fontSize: vars.typography.size['5xl'],
  fontWeight: vars.typography.weight.bold,
  color: vars.colors.primaryHover,
  marginBottom: vars.spacing['2'],
});

globalStyle(`${statsSection} .stat-item p`, {
  fontSize: vars.typography.size.xl,
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
      fontSize: vars.typography.size.base,
    },
  },
});

export const ctaSection = style({
  background: vars.colors.gradientPrimary,
  color: vars.background.body,
  padding: `${vars.spacing['7']} 0`,
  textAlign: 'center',
});

globalStyle(`${ctaSection} h2`, {
  color: 'white',
  marginBottom: vars.spacing['3'],
});

globalStyle(`${ctaSection} p`, {
  fontSize: vars.typography.size.xl,
  marginBottom: vars.spacing['5'],
  maxWidth: '500px',
  marginLeft: 'auto',
  marginRight: 'auto',
  color: 'rgba(255,255,255,0.92)',
});

export const heroPrimaryButton = style({
  background: 'white',
  color: '#BE123C',
  borderColor: 'white',
});

export const heroSecondaryButton = style({
  color: 'white',
  borderColor: 'rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.08)',
});

export const ctaSecondaryButton = style({
  color: 'white',
  borderColor: 'rgba(255,255,255,0.6)',
  background: 'transparent',
});

export const centerAlign = style({
  textAlign: 'center',
});
