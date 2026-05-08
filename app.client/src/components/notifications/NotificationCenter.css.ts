import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const notificationCenter = style({
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  overflow: 'hidden',
  maxWidth: '600px',
  width: '100%',
});

export const header = style({
  padding: '1.5rem',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

globalStyle(`${header} h2`, {
  fontSize: '1.25rem',
  color: vars.text.primary,
  margin: 0,
});

export const filterBar = style({
  padding: '1rem 1.5rem',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  display: 'flex',
  gap: '1rem',
  alignItems: 'center',
  flexWrap: 'wrap',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const filterSelect = style({
  padding: '0.5rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '6px',
  background: vars.background.primary,
  color: vars.text.primary,
  fontSize: '0.875rem',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
  },
});

export const notificationList = style({
  maxHeight: '500px',
  overflowY: 'auto',
});

export const notificationItem = recipe({
  base: {
    padding: '1rem 1.5rem',
    borderBottom: `1px solid ${vars.border.color.primary}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    ':hover': {
      background: vars.background.secondary,
    },
    selectors: {
      '&:last-child': {
        borderBottom: 'none',
      },
    },
  },
  variants: {
    isRead: {
      true: {
        background: vars.background.primary,
      },
      false: {
        background: vars.background.secondary,
      },
    },
  },
  defaultVariants: { isRead: true },
});

export const notificationHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.5rem',
});

export const notificationTitle = recipe({
  base: {
    fontSize: '1rem',
    color: vars.text.primary,
    margin: 0,
  },
  variants: {
    isRead: {
      true: {
        fontWeight: 'normal',
      },
      false: {
        fontWeight: 600,
      },
    },
  },
  defaultVariants: { isRead: true },
});

export const notificationTime = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
  whiteSpace: 'nowrap',
});

export const notificationMessage = style({
  fontSize: '0.875rem',
  color: vars.text.secondary,
  margin: 0,
  lineHeight: 1.4,
});

export const notificationActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: '0.75rem',
});

export const actionButton = style({
  padding: '0.25rem 0.5rem',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  background: vars.colors.neutral['200'],
  color: vars.text.primary,
  transition: 'background-color 0.2s ease',
  ':hover': {
    background: vars.colors.neutral['300'],
  },
});

export const actionButtonPrimary = style({
  padding: '0.25rem 0.5rem',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  background: vars.colors.primary['500'],
  color: 'white',
  transition: 'background-color 0.2s ease',
  ':hover': {
    background: vars.colors.primary['600'],
  },
});

export const actionButtonDanger = style({
  padding: '0.25rem 0.5rem',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.75rem',
  cursor: 'pointer',
  background: vars.colors.semantic.error['500'],
  color: 'white',
  transition: 'background-color 0.2s ease',
  ':hover': {
    background: vars.colors.semantic.error['600'],
  },
});

export const emptyState = style({
  padding: '3rem 1.5rem',
  textAlign: 'center',
  color: vars.text.secondary,
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.1rem',
  marginBottom: '0.5rem',
  color: vars.text.primary,
});

globalStyle(`${emptyState} p`, {
  fontSize: '0.875rem',
  margin: 0,
});

export const loadingState = style({
  padding: '2rem 1.5rem',
  textAlign: 'center',
  color: vars.text.secondary,
});

export const pagination = style({
  padding: '1rem 1.5rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

globalStyle(`${pagination} span`, {
  fontSize: '0.875rem',
  color: vars.text.secondary,
});

export const paginationButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const headerActions = style({
  display: 'flex',
  gap: '0.5rem',
});
