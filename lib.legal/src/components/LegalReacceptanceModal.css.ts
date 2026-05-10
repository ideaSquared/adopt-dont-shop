import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  padding: '1.5rem',
  maxWidth: '520px',
});

export const description = style({
  color: vars.colors.neutral['700'],
  marginBottom: '1.5rem',
  lineHeight: 1.6,
});

export const documentList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '1.5rem',
});

export const documentItem = style({
  border: `1px solid ${vars.colors.neutral['200']}`,
  borderRadius: '0.5rem',
  padding: '1rem',
});

export const documentLabel = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  cursor: 'pointer',
});

export const checkbox = style({
  marginTop: '0.25rem',
  width: '1.1rem',
  height: '1.1rem',
  flexShrink: 0,
});

export const documentTextBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const documentTitle = style({
  fontWeight: 600,
  color: vars.colors.neutral['900'],
});

export const documentMeta = style({
  fontSize: '0.85rem',
  color: vars.colors.neutral['600'],
});

export const documentLink = style({
  fontSize: '0.85rem',
  color: vars.colors.primary['600'],
  textDecoration: 'underline',
});

export const errorAlert = style({
  marginBottom: '1rem',
});

export const actionButtons = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
});

export const buttonSpinner = style({
  marginRight: '0.5rem',
});
