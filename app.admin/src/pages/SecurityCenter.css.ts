import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1100px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '1.5rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: vars.colors.neutral['800'],
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const tabBar = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  marginBottom: '1.5rem',
});

export const tabButton = style({
  background: 'transparent',
  border: 'none',
  padding: '0.75rem 1rem',
  fontSize: '0.95rem',
  color: vars.text.tertiary,
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  transition: 'all 120ms ease',
  selectors: {
    '&:hover': { color: vars.text.primary },
    '&[aria-selected="true"]': {
      color: vars.colors.semantic.info['700'],
      borderBottomColor: vars.colors.semantic.info['700'],
      fontWeight: 600,
    },
  },
});

export const section = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.25rem',
});

globalStyle(`${section} h2`, {
  fontSize: '1.15rem',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${section} > p`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
  margin: '0 0 1rem 0',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
});

globalStyle(`${table} th, ${table} td`, {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  borderBottom: `1px solid ${vars.background.tertiary}`,
  fontSize: '0.875rem',
});

globalStyle(`${table} th`, {
  fontWeight: 600,
  color: vars.text.secondary,
  background: vars.background.primary,
});

export const inlineForm = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const input = style({
  padding: '0.4rem 0.6rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  minWidth: '140px',
});

export const select = style([input]);

export const dangerButton = style({
  background: vars.colors.semantic.error['600'],
  color: 'white',
  border: 'none',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.colors.semantic.error['700'] },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
});

export const primaryButton = style({
  background: vars.colors.semantic.info['700'],
  color: 'white',
  border: 'none',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.colors.semantic.info['800'] },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
  },
});

export const secondaryButton = style({
  background: 'white',
  color: vars.text.secondary,
  border: `1px solid ${vars.border.color.secondary}`,
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  selectors: { '&:hover': { background: vars.background.primary } },
});

export const emptyState = style({
  padding: '1.5rem',
  textAlign: 'center',
  color: vars.text.tertiary,
  fontSize: '0.9rem',
});

export const errorBanner = style({
  padding: '0.75rem 1rem',
  background: vars.colors.semantic.error['50'],
  border: `1px solid ${vars.colors.semantic.error['200']}`,
  color: vars.colors.semantic.error['800'],
  borderRadius: '0.375rem',
  marginBottom: '1rem',
  fontSize: '0.875rem',
});

export const statusPill = style({
  display: 'inline-block',
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600,
});

export const statusSuccess = style([
  statusPill,
  { background: vars.colors.semantic.success['100'], color: vars.colors.semantic.success['800'] },
]);
export const statusFailure = style([
  statusPill,
  { background: vars.colors.semantic.error['100'], color: vars.colors.semantic.error['800'] },
]);
export const statusNeutral = style([
  statusPill,
  { background: vars.border.color.primary, color: vars.text.secondary },
]);

export const userIdSubtext = style({
  color: vars.text.tertiary,
  fontSize: '0.75rem',
});

export const successBanner = style([
  errorBanner,
  {
    background: '#ecfdf5',
    borderColor: '#a7f3d0',
    color: vars.colors.semantic.success['800'],
  },
]);
