import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  maxWidth: '600px',
});

export const stepTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const stepDescription = style({
  color: vars.text.secondary,
  marginBottom: '2rem',
});

export const form = style({
  display: 'grid',
  gap: '1.5rem',
});

export const supportedFormats = style({
  fontSize: '0.85rem',
  color: vars.text.secondary,
  marginTop: '0.5rem',
});

export const documentList = style({
  display: 'grid',
  gap: '0.75rem',
  marginTop: '1.5rem',
});

export const documentCard = style({
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '1rem',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '8px',
  background: vars.background.secondary,
});

export const documentInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  minWidth: 0,
});

export const documentName = style({
  fontSize: '0.9rem',
  color: vars.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const documentSize = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
});

export const documentTypeSelect = style({
  padding: '0.375rem 0.5rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '4px',
  fontSize: '0.85rem',
  background: vars.background.primary,
  color: vars.text.primary,
  cursor: 'pointer',
});

export const removeButton = style({
  background: 'none',
  border: 'none',
  color: vars.colors.semantic.error['500'],
  cursor: 'pointer',
  padding: '0.25rem',
  fontSize: '1.2rem',
  lineHeight: 1,
  borderRadius: '4px',
  ':hover': {
    backgroundColor: `${vars.colors.semantic.error['100']}20`,
  },
});

export const skipNote = style({
  fontSize: '0.85rem',
  color: vars.text.secondary,
  fontStyle: 'italic',
  marginTop: '0.5rem',
});
