import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  padding: '1.5rem',
  maxWidth: '520px',
});

export const description = style({
  color: vars.text.secondary,
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
  border: `1px solid ${vars.border.color.muted}`,
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
  color: vars.text.primary,
});

export const documentMeta = style({
  fontSize: '0.85rem',
  color: vars.text.tertiary,
});

export const documentLink = style({
  fontSize: '0.85rem',
  color: vars.colors.primaryHover,
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
