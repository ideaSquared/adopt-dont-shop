import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const headerLeft = style({});

globalStyle(`${headerLeft} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerLeft} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const tabBar = style({
  display: 'flex',
  gap: 0,
  borderBottom: `2px solid ${vars.border.color.primary}`,
});

export const tab = style({
  padding: '0.75rem 1.5rem',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: '-2px',
  color: vars.text.tertiary,
  fontWeight: '400',
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
});

export const tabActive = style({
  borderBottomColor: vars.colors.semantic.info['600'],
  color: vars.colors.semantic.info['600'],
  fontWeight: '600',
});

export const card = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  padding: '1.5rem',
});

export const filterBar = style({
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  minWidth: '160px',
});

export const filterLabel = style({
  fontSize: '0.8rem',
  fontWeight: '500',
  color: vars.text.secondary,
});

export const select = style({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: vars.background.secondary,
  color: vars.text.primary,
  cursor: 'pointer',
});

export const searchWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '220px',
});

globalStyle(`${searchWrapper} svg`, {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: vars.text.quaternary,
});

export const searchInput = style({
  width: '100%',
  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
});

export const th = style({
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.tertiary,
  borderBottom: `1px solid ${vars.border.color.primary}`,
  background: vars.background.primary,
});

export const td = style({
  padding: '0.875rem 1rem',
  borderBottom: `1px solid ${vars.background.tertiary}`,
  fontSize: '0.875rem',
  color: vars.text.secondary,
  verticalAlign: 'middle',
});

export const statusBadgePublished = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: vars.colors.semantic.success['100'],
  color: vars.colors.semantic.success['800'],
});

export const statusBadgeDraft = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: vars.colors.semantic.warning['100'],
  color: vars.colors.semantic.warning['800'],
});

export const statusBadgeScheduled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

export const statusBadgeDefault = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.625rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '500',
  background: vars.background.tertiary,
  color: vars.text.secondary,
});

export const actionGroup = style({
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
});

export const iconButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.primary}`,
  background: vars.background.secondary,
  color: vars.text.tertiary,
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const iconButtonPrimary = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: '1px solid #93c5fd',
  background: vars.colors.semantic.info['50'],
  color: vars.colors.semantic.info['600'],
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const iconButtonDanger = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.375rem',
  borderRadius: '6px',
  border: '1px solid #fca5a5',
  background: vars.colors.semantic.error['50'],
  color: vars.colors.semantic.error['600'],
  cursor: 'pointer',
  ':hover': {
    opacity: 0.8,
  },
});

export const primaryButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1.25rem',
  background: vars.colors.semantic.info['600'],
  color: vars.background.secondary,
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
  ':hover': {
    background: vars.colors.semantic.info['700'],
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
});

export const modal = style({
  background: vars.background.secondary,
  borderRadius: '16px',
  width: '100%',
  maxWidth: '760px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

globalStyle(`${modalHeader} h2`, {
  margin: 0,
  fontSize: '1.25rem',
  color: vars.text.primary,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  color: vars.text.tertiary,
  lineHeight: 1,
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
});

export const formGroupFull = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  gridColumn: '1 / -1',
});

export const formLabel = style({
  fontSize: '0.8rem',
  fontWeight: '600',
  color: vars.text.secondary,
});

export const formInput = style({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.semantic.info['600'],
  },
  ':disabled': {
    background: vars.background.primary,
    color: vars.text.quaternary,
  },
});

export const formTextarea = style({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  resize: 'vertical',
  minHeight: '200px',
  fontFamily: 'monospace',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.semantic.info['600'],
  },
});

export const formSelect = style({
  padding: '0.5rem 0.75rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  background: vars.background.secondary,
});

export const modalActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  paddingTop: '0.5rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
});

export const secondaryButton = style({
  padding: '0.625rem 1.25rem',
  border: `1px solid ${vars.border.color.secondary}`,
  background: vars.background.secondary,
  color: vars.text.secondary,
  borderRadius: '8px',
  fontSize: '0.875rem',
  cursor: 'pointer',
});

export const emptyState = style({
  padding: '3rem',
  textAlign: 'center',
  color: vars.text.quaternary,
  fontSize: '0.95rem',
});

export const errorMessage = style({
  color: vars.colors.semantic.error['600'],
  fontSize: '0.875rem',
  margin: 0,
});

export const seoSection = style({
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '8px',
  padding: '1rem',
  background: vars.background.primary,
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const seoTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.secondary,
  margin: 0,
});

export const slugCell = style({
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  color: '#6b7280',
});

export const capitalize = style({
  textTransform: 'capitalize',
});

export const slugInputRow = style({
  display: 'flex',
  gap: '0.5rem',
});

export const slugInputFlex = style({
  flex: 1,
});

export const excerptTextarea = style({
  minHeight: '80px',
});

export const metaDescTextarea = style({
  minHeight: '70px',
});

export const menuModalWidth = style({
  maxWidth: '480px',
});
