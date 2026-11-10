import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '1000px',
  margin: '0 auto',
  padding: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
    },
  },
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['5'],
  marginBottom: vars.spacing['5'],
});

export const sectionTitle = style({
  fontSize: vars.typography.size['2xl'],
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
});

export const profileInfo = style({
  display: 'grid',
  gap: vars.spacing['3'],
});

export const infoItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.spacing['3']} 0`,
  borderBottom: `1px solid ${vars.border.color.default}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const infoLabel = style({
  fontWeight: vars.typography.weight.medium,
  color: vars.text.tertiary,
});

export const infoValue = style({
  color: vars.text.primary,
});

export const applicationsGrid = style({
  display: 'grid',
  gap: vars.spacing['3'],
});

export const applicationCard = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const applicationInfo = style({});

globalStyle(`${applicationInfo} h3`, {
  fontSize: '1.1rem',
  color: vars.text.primary,
  marginBottom: vars.spacing['2'],
});

globalStyle(`${applicationInfo} p`, {
  color: vars.text.tertiary,
  fontSize: vars.typography.size.sm,
});

export const sectionGap = style({
  marginBottom: vars.spacing['3'],
});

export const sectionTopGap = style({
  marginTop: vars.spacing['5'],
});

export const smallTopGap = style({
  marginTop: vars.spacing['2'],
});

export const buttonTopGap = style({
  marginTop: vars.spacing['3'],
});

export const centeredEmpty = style({
  textAlign: 'center',
  padding: vars.spacing['5'],
});
