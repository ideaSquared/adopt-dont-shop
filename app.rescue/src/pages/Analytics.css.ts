import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '100%',
  margin: 0,
  padding: 0,
});

export const pageHeader = style({
  marginBottom: '2rem',
});

export const headerTop = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  },
});

export const headerTitle = style({});

globalStyle(`${headerTitle} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerTitle} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      flexDirection: 'column',
    },
  },
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});

export const filterSelect = style({
  padding: '0.625rem 1rem',
  background: 'white',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      borderColor: vars.colors.semantic.info['400'],
    },
    '&:focus': {
      outline: 'none',
      borderColor: vars.colors.semantic.info['400'],
      boxShadow: `0 0 0 3px ${vars.colors.semantic.info['100']}`,
    },
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const chartsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
});

export const twoColumnGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: '1.5rem',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const cardHeader = style({
  padding: '1.5rem 1.5rem 1rem 1.5rem',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const cardTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

globalStyle(`${cardTitle} h3`, {
  margin: 0,
  fontSize: '1.125rem',
  fontWeight: 600,
  color: vars.text.primary,
});

globalStyle(`${cardTitle} svg`, {
  color: vars.colors.semantic.info['600'],
  fontSize: '1.25rem',
});

export const cardBody = style({
  padding: '1.5rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 1rem',
  color: vars.text.tertiary,
});

globalStyle(`${emptyState} svg`, {
  fontSize: '3rem',
  color: vars.border.color.secondary,
  marginBottom: '1rem',
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${emptyState} p`, {
  margin: 0,
});

export const errorState = style({
  textAlign: 'center',
  padding: '2rem',
  color: vars.colors.semantic.error['600'],
  background: vars.colors.semantic.error['50'],
  border: `1px solid ${vars.colors.semantic.error['200']}`,
  borderRadius: '8px',
});

globalStyle(`${errorState} p`, {
  margin: 0,
});
