import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const banner = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  background: vars.colors.neutral['50'],
  borderTop: `1px solid ${vars.colors.neutral['300']}`,
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const headerRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const title = style({
  fontWeight: 600,
  fontSize: '1rem',
  color: vars.colors.neutral['900'],
  margin: 0,
});

export const description = style({
  margin: 0,
  color: vars.colors.neutral['700'],
  fontSize: '0.9rem',
  lineHeight: 1.5,
});

export const policyLink = style({
  color: vars.colors.primary['600'],
  textDecoration: 'underline',
});

export const actionRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
});

export const detailsBlock = style({
  borderTop: `1px solid ${vars.colors.neutral['200']}`,
  paddingTop: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const categoryRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const categoryLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontWeight: 600,
  color: vars.colors.neutral['900'],
});

export const categoryMeta = style({
  fontSize: '0.85rem',
  color: vars.colors.neutral['600'],
  fontWeight: 400,
});

export const categoryDescription = style({
  margin: 0,
  fontSize: '0.85rem',
  color: vars.colors.neutral['700'],
  lineHeight: 1.5,
});

export const checkbox = style({
  width: '1.1rem',
  height: '1.1rem',
});

export const togglesActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});
