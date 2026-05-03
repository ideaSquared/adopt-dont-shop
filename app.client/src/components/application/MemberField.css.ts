import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  borderRadius: '0.5rem',
  padding: '1rem',
  background: vars.background.primary,
});

export const containerVariants = styleVariants({
  normal: { border: `1px solid ${vars.border.color.primary}` },
  error: { border: `1px solid ${vars.colors.semantic.error['500']}` },
});

export const addSection = style({
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
});

export const addButton = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.625rem 0.875rem',
  minWidth: '4.5rem',
  border: `2px dashed ${vars.border.color.primary}`,
  borderRadius: '0.5rem',
  background: vars.background.secondary,
  cursor: 'pointer',
  position: 'relative',
  transition: 'border-color 0.15s, background 0.15s',
  ':hover': {
    borderColor: vars.colors.primary['400'],
    background: vars.colors.primary['50'],
  },
});

export const addIcon = style({
  fontSize: '1.75rem',
  lineHeight: '1',
});

export const addLabel = style({
  fontSize: '0.6875rem',
  color: vars.text.secondary,
  fontWeight: '500',
  whiteSpace: 'nowrap',
});

export const countBadge = style({
  position: 'absolute',
  top: '-0.4rem',
  right: '-0.4rem',
  background: vars.colors.primary['500'],
  color: 'white',
  borderRadius: '9999px',
  minWidth: '1.25rem',
  height: '1.25rem',
  padding: '0 0.25rem',
  fontSize: '0.6875rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
});

export const plusIcon = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
  fontWeight: '700',
});

export const itemsSection = style({
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const itemCard = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.375rem 0.5rem 0.375rem 0.75rem',
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '2rem',
});

export const itemIcon = style({
  fontSize: '1.25rem',
  lineHeight: '1',
});

export const itemInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const itemInfoColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const itemLabel = style({
  fontSize: '0.8125rem',
  fontWeight: '500',
  color: vars.text.primary,
  lineHeight: '1',
});

export const itemSubLabel = style({
  fontSize: '0.6875rem',
  color: vars.text.secondary,
  lineHeight: '1',
});

export const detailRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
});

export const detailLabel = style({
  fontSize: '0.6875rem',
  color: vars.text.secondary,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  cursor: 'pointer',
});

export const ageRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

export const ageLabel = style({
  fontSize: '0.6875rem',
  color: vars.text.secondary,
});

export const ageInput = style({
  width: '3rem',
  padding: '0.125rem 0.25rem',
  fontSize: '0.75rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.25rem',
  color: vars.text.primary,
  background: vars.background.primary,
  outline: 'none',
  textAlign: 'center',
  ':focus': {
    borderColor: vars.colors.primary['500'],
  },
});

export const ageInputNarrow = style({
  width: '2.75rem',
  padding: '0.125rem 0.25rem',
  fontSize: '0.75rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.25rem',
  color: vars.text.primary,
  background: vars.background.primary,
  outline: 'none',
  textAlign: 'center',
  ':focus': {
    borderColor: vars.colors.primary['500'],
  },
});

export const neuteredToggle = style({
  margin: '0',
  cursor: 'pointer',
});

export const removeButton = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: vars.text.secondary,
  fontSize: '1.125rem',
  lineHeight: '1',
  padding: '0.125rem 0.25rem',
  borderRadius: '9999px',
  display: 'flex',
  alignItems: 'center',
  transition: 'color 0.15s, background 0.15s',
  ':hover': {
    color: vars.colors.semantic.error['600'],
    background: vars.colors.semantic.error['50'],
  },
});

export const emptyHint = style({
  margin: '0.75rem 0 0',
  paddingTop: '0.75rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  textAlign: 'center',
});
