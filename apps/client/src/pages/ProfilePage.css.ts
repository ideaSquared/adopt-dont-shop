import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  padding: '2rem',
  marginBottom: '2rem',
});

export const sectionTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

export const profileInfo = style({
  display: 'grid',
  gap: '1rem',
});

export const infoItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const infoLabel = style({
  fontWeight: '500',
  color: vars.text.tertiary,
});

export const infoValue = style({
  color: vars.text.primary,
});

export const applicationsGrid = style({
  display: 'grid',
  gap: '1rem',
});

export const applicationCard = style({
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  padding: '1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
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
  marginBottom: '0.5rem',
});

globalStyle(`${applicationInfo} p`, {
  color: vars.text.tertiary,
  fontSize: '0.875rem',
});

export const sectionGap = style({
  marginBottom: '1rem',
});

export const sectionTopGap = style({
  marginTop: '2rem',
});

export const smallTopGap = style({
  marginTop: '0.5rem',
});

export const buttonTopGap = style({
  marginTop: '1rem',
});

export const centeredEmpty = style({
  textAlign: 'center',
  padding: '2rem',
});
