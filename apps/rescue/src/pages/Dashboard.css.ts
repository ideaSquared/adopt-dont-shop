import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const dashboardContainer = style({
  maxWidth: 'none',
  margin: 0,
  width: '100%',
  padding: 0,
});

export const onboardingBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  background: `linear-gradient(135deg, ${vars.colors.successBgSubtle} 0%, ${vars.colors.infoBgSubtle} 100%)`,
  border: `1px solid ${vars.colors.successBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

export const onboardingContent = style({
  flex: 1,
});

export const onboardingTitle = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  fontSize: '1.1rem',
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const onboardingText = style({
  margin: `0 0 ${vars.spacing['3']} 0`,
  color: vars.text.secondary,
  fontSize: '0.95rem',
});

export const onboardingActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
});

export const onboardingLink = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: vars.colors.info,
  color: 'white',
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  transition: 'background 0.2s ease',
  selectors: {
    '&:hover': {
      background: vars.colors.infoHover,
    },
  },
});

export const onboardingDismiss = style({
  background: 'none',
  border: 'none',
  fontSize: vars.typography.size.xl,
  color: vars.text.tertiary,
  cursor: 'pointer',
  padding: vars.spacing['1'],
  lineHeight: 1,
  borderRadius: vars.border.radius.sm,
  transition: 'color 0.2s ease',
  ':hover': {
    color: vars.text.primary,
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
  width: '100%',
});

export const sectionHeading = style({
  margin: `0 0 ${vars.spacing['3']} 0`,
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const attentionList = style({
  listStyle: 'none',
  margin: `0 0 ${vars.spacing['5']} 0`,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const attentionItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

export const attentionText = style({
  margin: 0,
  fontSize: vars.typography.size.xl,
  color: vars.text.primary,
});

export const allClear = style({
  margin: `0 0 ${vars.spacing['5']} 0`,
  padding: vars.spacing['4'],
  background: vars.colors.successBgSubtle,
  border: `1px solid ${vars.colors.successBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  fontSize: vars.typography.size.xl,
  color: vars.colors.successTextEmphasis,
});

export const actionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '3rem',
  padding: `${vars.spacing['2']} ${vars.spacing['5']}`,
  background: vars.colors.primary,
  color: vars.text.inverse,
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  selectors: {
    '&:hover': {
      background: vars.colors.primaryHover,
    },
    '&:focus-visible': {
      outline: `3px solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const quickActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['5'],
});

export const errorCard = style({
  padding: vars.spacing['4'],
  textAlign: 'center',
});

export const errorHint = style({
  color: vars.text.secondary,
  marginBottom: vars.spacing['3'],
});

export const errorActions = style({
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['3'],
});
